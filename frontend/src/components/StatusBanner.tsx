type StatusBannerProps = {
  message: string
}

export function StatusBanner({ message }: StatusBannerProps) {
  return <p className="status">{message}</p>
}
