import { Registration, Login } from "../opaque-wasm/opaque_wasm"

const ctx: Worker = self as any

let registration = new Registration()

onmessage = event => {
  console.log("got message " + JSON.stringify(event.data))
  // ctx.postMessage({ bla: "foo" })
  // return
  if (event.data.action === "register") {
    if (!event.data.password) {
      ctx.postMessage({ error: "No password provided" })
      return
    }

    console.log("Generating registration request")
    registration = new Registration()
    const registrationRequest = registration.start(event.data.password)

    ctx.postMessage({ registrationRequest: Array.from(registrationRequest) })
  } else if (event.data.action === "finishRegistration") {
    if (!registration) {
      ctx.postMessage({ error: "Registration not initialized" })
      return
    }

    const parsedKey = new Uint8Array(event.data.key)
    console.log("Generating registration key")
    const registrationKey = registration.finish(parsedKey)

    ctx.postMessage({ registrationKey: Array.from(registrationKey) })
  }
}
