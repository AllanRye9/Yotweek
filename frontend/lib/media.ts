// Listing galleries (events/businesses) store cover + gallery items as
// plain URL strings with no separate "type" column, so we tell photos and
// videos apart by file extension.
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}
