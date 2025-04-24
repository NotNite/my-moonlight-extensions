import { UserStore } from "@moonlight-mod/wp/common_stores";

type Message = { author?: { id: string; username?: string } };

export function messageAttributes(message: Message) {
  const author = message?.author;
  const authorId = author?.id;
  const selfId = UserStore.getCurrentUser()?.id;

  return {
    "data-author-id": authorId,
    "data-author-username": author?.username,
    "data-is-self": authorId != null && selfId != null && authorId === selfId
  };
}

const AVATAR_SIZES = [128, 256, 512, 1024, 2048, 4096];
export function avatarUrls(avatar: string) {
  if (!avatar) return {};

  return Object.fromEntries(
    AVATAR_SIZES.map((size) => [`--avatar-url-${size}`, `url(${avatar.replace(/size=\d+/, `size=${size}`)})`])
  );
}
