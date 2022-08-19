import * as argon2 from "argon2-browser"
import { aesGcmEncrypt, aesGcmDecrypt } from "./utils/aes"
import { uint8ArrayToHex } from "./utils/hex"

import ecdsaSign from "@runonbitcoin/nimble/functions/ecdsa-sign"
import decodeHex from "@runonbitcoin/nimble/functions/decode-hex"
import encodeDER from "@runonbitcoin/nimble/functions/encode-der"
import encodeHex from "@runonbitcoin/nimble/functions/encode-hex"
import sha256ripemd160 from "@runonbitcoin/nimble/functions/sha256ripemd160"

import PublicKey from "@runonbitcoin/nimble/classes/public-key"
import PrivateKey from "@runonbitcoin/nimble/classes/private-key"

const opaqueWorker = new Worker(new URL("./opaque.worker.ts", import.meta.url))

export function getRandomSalt(): string {
  const saltArray = crypto.getRandomValues(new Uint8Array(128))
  return uint8ArrayToHex(saltArray)
}

// Example POST method implementation:
async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json"
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  })

  if (response.status !== 200) {
    console.error(response.status)
    const json = await response.json()
    console.error(json)
    throw new Error(json.message || json.error)
  }

  return response.json() // parses JSON response into native JavaScript objects
}

export async function register(
  password: string,
  secret: string,
  serverURL: string,
  privKey: string,
  reset = false
): Promise<boolean> {
  // TODO: Make sure password is good
  if (!password) {
    throw new Error("No password provided")
  }

  if (!privKey) {
    throw new Error("No private key provided")
  }

  // TODO: Make sure that secret is valid seed phrase
  if (!secret) {
    throw new Error("No seed phrase provided")
  }

  if (typeof secret !== "string") {
    throw new Error("Invalid seed phrase")
  }

  let privateKey: PrivateKey
  try {
    privateKey = PrivateKey.fromString(privKey)
  } catch (e) {
    throw new Error("Invalid private key (WIF) provided")
  }
  const publicKey = PublicKey.fromPrivateKey(privateKey)

  let sigChallenge: string

  console.log("Hashing password...")
  const salt = getRandomSalt()
  console.log("Salt:", salt)

  const argon2Hash = await argon2.hash({ pass: password, salt })

  console.log("Argon Hash: ", argon2Hash)

  console.log("Encrypting secret...")
  const encryptedSecret = await aesGcmEncrypt(secret, argon2Hash.hashHex)

  console.log("Encrypted secret:", encryptedSecret)

  console.log("Requesting registration")

  let serverRegistrationKey: number[]

  return new Promise<boolean>((resolve, reject) => {
    opaqueWorker.onmessage = event => {
      console.log(event.data)

      if ("error" in event.data) {
        reject(new Error(event.data.error))
      }

      if ("registrationRequest" in event.data) {
        sendRegistrationRequest(event.data.registrationRequest).catch(err => {
          reject(err)
        })
      } else if ("registrationKey" in event.data) {
        finishRegistration(event.data.registrationKey)
          .then(() => resolve(true))
          .catch(err => {
            reject(err)
          })
      }
    }

    opaqueWorker.postMessage({ action: "register", password })
  })

  async function sendRegistrationRequest(request: number[]) {
    const payload = { request, wallet: encryptedSecret, salt, pubKey: publicKey.toString(), reset }

    // TODO: Encrypt secret and salt somehow before sending?
    const res = await postData(serverURL + "/register", payload)

    if (!res.key) throw new Error("No registration key returned")
    if (!res.sigChallenge) throw new Error("No signature challenge returned")

    serverRegistrationKey = res.key
    sigChallenge = res.sigChallenge

    console.log("Requesting Step 1 success")

    console.log("Registration key: ", serverRegistrationKey)

    // const parsedKey = new Uint8Array(serverRegistrationKey)

    console.log("Getting registration key")
    opaqueWorker.postMessage({ action: "finishRegistration", key: serverRegistrationKey })
  }

  async function finishRegistration(registrationKey: number[]) {
    const registrationKeyPath = serverRegistrationKey.map((n: number) => n.toString(16)).join("")

    if (!sigChallenge) throw new Error("No signature challenge found")

    // Generate signature
    const challengeHash = decodeHex(sigChallenge)
    const signature = ecdsaSign(challengeHash, privateKey.number, publicKey.point)

    const payload2 = {
      key: Array.from(registrationKey),
      signature: encodeHex(encodeDER(signature))
    }

    console.log("Finishing registration")

    const res2 = await postData(serverURL + "/register/" + registrationKeyPath, payload2)

    console.log("success!")
    console.log(res2)
  }
}

type loginResult = { seed: string; verified: boolean }

export async function login(pubKeyHashId: string, password: string, serverURL: string) {
  let serverLoginKey: number[]

  return new Promise<loginResult>((resolve, reject) => {
    opaqueWorker.onmessage = event => {
      console.log(event.data)

      if ("error" in event.data) {
        reject(new Error(event.data.error))
      }

      if ("loginRequest" in event.data) {
        sendLoginRequest(event.data.loginRequest).catch(err => {
          reject(err)
        })
      } else if ("loginKey" in event.data) {
        finishLogin(event.data.loginKey)
          .then(res => resolve(res))
          .catch(err => {
            reject(err)
          })
      }
    }

    opaqueWorker.postMessage({ action: "login", password })
  })

  async function sendLoginRequest(request: number[]) {
    const payload = { request, pubKeyHashId }

    // TODO: Encrypt secret and salt somehow before sending?

    const res = await postData(serverURL + "/login", payload)

    console.log("Requesting Step 1 success")

    serverLoginKey = res.key

    console.log(serverLoginKey)

    // const parsedKey = new Uint8Array(serverRegistrationKey)

    console.log("Getting login key")
    opaqueWorker.postMessage({ action: "finishLogin", key: serverLoginKey })
  }

  async function finishLogin(loginKey: number[]): Promise<loginResult> {
    const loginKeyPath = serverLoginKey.map((n: number) => n.toString(16)).join("")

    const payload2 = {
      key: Array.from(loginKey)
    }

    console.log("Finishing login")

    const res2 = await postData(serverURL + "/login/" + loginKeyPath, payload2)

    const passwordHash = await argon2.hash({ pass: password, salt: res2.salt })

    const seed = await aesGcmDecrypt(res2.wallet, passwordHash.hashHex)
    console.log("success!")

    return { seed, verified: res2.verified }
  }
}

export function getPubKeyHashId(publicKeyHex: string) {
  const pubKey = PublicKey.fromString(publicKeyHex)
  return encodeHex(sha256ripemd160(pubKey.toBuffer()))
}
