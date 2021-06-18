import * as argon2 from "argon2-browser"
import { aesGcmEncrypt } from "./utils/aes"
import { uint8ArrayToHex } from "./utils/hex"
import { Registration, Login } from "../opaque-wasm/opaque_wasm"

import OpaqueWorker from "worker-loader!./opaque.worker.ts"
// import OpaqueWorker from "./opaque.worker"

const serverURL = "http://localhost:8000"

export function getRandomSalt(): string {
  const saltArray = crypto.getRandomValues(new Uint8Array(128))
  return uint8ArrayToHex(saltArray)
}

const opaqueWorker = new OpaqueWorker()

export async function register(username: string, password: string, secret: string) {
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

  opaqueWorker.onmessage = async event => {
    console.log(event.data)
    if ("registrationRequest" in event.data) {
      await sendRegistrationRequest(event.data.registrationRequest)
    } else if ("registrationKey" in event.data) {
      await finishRegistration(event.data.registrationKey)
      opaqueWorker.terminate()
    }
  }

  opaqueWorker.postMessage({ action: "register", password })

  let serverRegistrationKey: number[]

  async function sendRegistrationRequest(request: number[]) {
    const payload = { request, username, wallet: encryptedSecret }

    // TODO: Encrypt secret and salt somehow before sending?
    const res = await postData(serverURL + "/register", payload)

    console.log("Requesting Step 1 success")

    // const { key: serverRegistrationKey }: { key: number[] } = res

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
    console.error(response.json())
    throw new Error("Request failed.")
  }

  return response.json() // parses JSON response into native JavaScript objects
}
