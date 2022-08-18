declare module "@runonbitcoin/nimble/functions/ecdsa-sign" {
  import { ByteArray, Point, Signature } from "@runonbitcoin/nimble"

  export default function ecdsaSign(hash32: ByteArray, privateKey: ByteArray, publicKey: Point): Signature | null
}

declare module "@runonbitcoin/nimble/functions/decode-hex" {
  import { ByteArray } from "@runonbitcoin/nimble"

  export default function decodeHex(hex: string): ByteArray
}

declare module "@runonbitcoin/nimble/functions/encode-hex" {
  import { ByteArray } from "@runonbitcoin/nimble"

  export default function encodeHex(buffer: ByteArray): string
}

declare module "@runonbitcoin/nimble/functions/encode-der" {
  import { ByteArray, Signature } from "@runonbitcoin/nimble"

  export default function encodeDER(signature: Signature): ByteArray
}

declare module "@runonbitcoin/nimble/functions/sha256" {
  import { ByteArray } from "@runonbitcoin/nimble"

  export default function sha256(data: ByteArray): ByteArray
}

declare module "@runonbitcoin/nimble/functions/sha256ripemd160" {
  import { ByteArray } from "@runonbitcoin/nimble"

  export default function sha256ripemd160(data: ByteArray): ByteArray
}

declare module "@runonbitcoin/nimble/classes/private-key" {
  import { PrivateKey } from "@runonbitcoin/nimble"

  export default PrivateKey
}

declare module "@runonbitcoin/nimble/classes/public-key" {
  import { PublicKey } from "@runonbitcoin/nimble"

  export default PublicKey
}
