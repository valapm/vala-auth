import { Registration, Login } from "../opaque-wasm/opaque_wasm"

// const ctx: Worker = self as any
const onmessage = event => {
  const registration = new Registration()
  const registrationRequest = registration.start("blabla")

  postMessage({ request: Array.from(registrationRequest) })
}
