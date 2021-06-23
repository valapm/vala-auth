import * as argon2 from "argon2-browser"
import { aesGcmEncrypt, aesGcmDecrypt } from "./utils/aes"
import { uint8ArrayToHex } from "./utils/hex"

import OpaqueWorker from "worker-loader!./opaque.worker.ts"
// import OpaqueWorker from "./opaque.worker"

const serverURL = "http://localhost:8000"

export function getRandomSalt(): string {
  const saltArray = crypto.getRandomValues(new Uint8Array(128))
  return uint8ArrayToHex(saltArray)
}

const opaqueWorker = new OpaqueWorker()

export async function register(username: string, password: string, secret: string): Promise<boolean> {
  // TODO: Make sure password is good
  if (!password) {
    throw new Error("No password provided")
  }

  if (!username) {
    throw new Error("No username provided")
  }

  // TODO: Make sure that secret is valid seed phrase
  if (!secret) {
    throw new Error("No seed phrase provided")
  }

  console.log("Hashing password...")
  const salt = getRandomSalt()
  console.log("Salt:", salt)

  const argon2Hash = await argon2.hash({ pass: password, salt })

  console.log(argon2Hash)

  console.log("Encrypting secret...")
  const encryptedSecret = await aesGcmEncrypt(secret, argon2Hash.hashHex)

  console.log("Encrypted secret:", encryptedSecret)

  console.log("Requesting registration")

  console.log("posting")

  let serverRegistrationKey: number[]

  return new Promise<boolean>(resolve => {
    opaqueWorker.onmessage = event => {
      console.log(event.data)
      if ("registrationRequest" in event.data) {
        sendRegistrationRequest(event.data.registrationRequest).catch(err => {
          throw err
        })
      } else if ("registrationKey" in event.data) {
        finishRegistration(event.data.registrationKey)
          .then(() => resolve(true))
          .catch(err => {
            throw err
          })
      }
    }

    opaqueWorker.postMessage({ action: "register", password })
  })

  async function sendRegistrationRequest(request: number[]) {
    const payload = { request, username, wallet: encryptedSecret, salt }

    // TODO: Encrypt secret and salt somehow before sending?
    const res = await postData(serverURL + "/register", payload)

    console.log("Requesting Step 1 success")

    serverRegistrationKey = res.key

    console.log(serverRegistrationKey)

    // const parsedKey = new Uint8Array(serverRegistrationKey)

    console.log("Getting registration key")
    opaqueWorker.postMessage({ action: "finishRegistration", key: serverRegistrationKey })
  }

  async function finishRegistration(registrationKey: number[]) {
    const registrationKeyPath = serverRegistrationKey.map((n: number) => n.toString(16)).join("")

    const payload2 = {
      key: Array.from(registrationKey)
    }

    console.log("Finishing registration")
    const res2 = await postData(serverURL + "/register/" + registrationKeyPath, payload2)

    console.log("success!")
    console.log(res2)
  }
}

export async function login(username: string, password: string) {
  let serverLoginKey: number[]

  return new Promise<string>(resolve => {
    opaqueWorker.onmessage = event => {
      console.log(event.data)
      if ("loginRequest" in event.data) {
        sendLoginRequest(event.data.loginRequest).catch(err => {
          throw err
        })
      } else if ("loginKey" in event.data) {
        finishLogin(event.data.loginKey)
          .then(seed => resolve(seed))
          .catch(err => {
            throw err
          })
      }
    }

    opaqueWorker.postMessage({ action: "login", password })
  })

  async function sendLoginRequest(request: number[]) {
    const payload = { request, username }

    // TODO: Encrypt secret and salt somehow before sending?
    const res = await postData(serverURL + "/login", payload)

    console.log("Requesting Step 1 success")

    serverLoginKey = res.key

    console.log(serverLoginKey)

    // const parsedKey = new Uint8Array(serverRegistrationKey)

    console.log("Getting login key")
    opaqueWorker.postMessage({ action: "finishLogin", key: serverLoginKey })
  }

  async function finishLogin(loginKey: number[]): Promise<string> {
    const loginKeyPath = serverLoginKey.map((n: number) => n.toString(16)).join("")

    const payload2 = {
      key: Array.from(loginKey)
    }

    console.log("Finishing login")
    const res2 = await postData(serverURL + "/login/" + loginKeyPath, payload2)

    const passwordHash = await argon2.hash({ pass: password, salt: res2.salt })

    const seed = await aesGcmDecrypt(res2.wallet, passwordHash.hashHex)
    console.log("success!")

    return seed
  }
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
    throw new Error(json.message)
  }

  return response.json() // parses JSON response into native JavaScript objects
}
