import { Registration, Login } from "../opaque-wasm/opaque_wasm"

const ctx: Worker = self as any

let registration: Registration
let login: Login

onmessage = event => {
  console.log("got message " + JSON.stringify(event.data))

  if (event.data.action === "register") {
    if (!("password" in event.data)) {
      ctx.postMessage({ error: "No password provided" })
      return
    }

    console.log("Generating registration request")
    registration = new Registration()
    const registrationRequest = registration.start(event.data.password)

    ctx.postMessage({ registrationRequest: Array.from(registrationRequest) })
  } else if (event.data.action === "finishRegistration") {
    if (!("key" in event.data)) {
      ctx.postMessage({ error: "No server registration key provided" })
      return
    }

    if (!registration) {
      ctx.postMessage({ error: "Registration not initialized" })
      return
    }

    const parsedKey = new Uint8Array(event.data.key)
    console.log("Generating registration key")
    const registrationKey = registration.finish(parsedKey)

    ctx.postMessage({ registrationKey: Array.from(registrationKey) })
  } else if (event.data.action === "login") {
    if (!("password" in event.data)) {
      ctx.postMessage({ error: "No password provided" })
      return
    }

    login = new Login()
    const loginRequest = login.start(event.data.password)

    ctx.postMessage({ loginRequest: Array.from(loginRequest) })
  } else if (event.data.action === "finishLogin") {
    if (!("key" in event.data)) {
      ctx.postMessage({ error: "No server login key provided" })
      return
    }

    if (!login) {
      ctx.postMessage({ error: "Login not initialized" })
      return
    }

    const parsedKey = new Uint8Array(event.data.key)
    console.log("Generating login key")
    const loginKey = login.finish(parsedKey)

    ctx.postMessage({ loginKey: Array.from(loginKey) })
  }
}
