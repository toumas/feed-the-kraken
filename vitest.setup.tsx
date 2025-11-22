import { vi } from "vitest";

vi.mock("next/image", () => ({
  // biome-ignore lint/suspicious/noExplicitAny: Mocking component props
  default: ({ src, alt, ...props }: any) => {
    // biome-ignore lint/performance/noImgElement: Mocking next/image
    return <img src={src} alt={alt} {...props} />;
  },
}));
