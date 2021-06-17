import { Registration, Login } from "../opaque-wasm/opaque_wasm"

onmessage = event => {
  const registration = new Registration()
  const registrationRequest = registration.start("blabla")

  postMessage({ request: Array.from(registrationRequest) })
}
