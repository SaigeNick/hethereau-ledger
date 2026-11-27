import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

/** QR code as a data-URL image (allowed by the CSP's img-src data:). */
export function QrCode({ text, label }: { text: string; label: string }) {
  const src = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    return qr.createDataURL(6, 3)
  }, [text])
  return <img className="qr" src={src} alt={label} width={180} height={180} />
}
