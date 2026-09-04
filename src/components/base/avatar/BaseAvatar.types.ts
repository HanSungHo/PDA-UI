export type BaseAvatarType = 'image' | 'text';
export type BaseAvatarShape = 'circle' | 'square';
export interface BaseAvatarProps {
  type?: BaseAvatarType | undefined;
  src?: string | undefined;
  alt?: string | undefined;
  text?: string | undefined;
  shape?: BaseAvatarShape | undefined;
}
