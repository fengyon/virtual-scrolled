import { debounce } from "lodash-es";
import { isFunction } from "../shared/judge";
import { isEqualRoughly } from "./view";

const requestAnimationFrameAsync = () =>
  new Promise((r) => requestAnimationFrame((t) => r(t)));

const toScrollAuto = async (
  scrollContainer: HTMLElement,
  getTargetScrollTop: () => number,
  scrollTime: number
) => {
  const originScrollBehavior = scrollContainer.style.scrollBehavior;
  scrollContainer.style.scrollBehavior = "auto";
  const changedScrollTop = getTargetScrollTop();
  const containerScrollTop = scrollContainer.scrollTop;
  const scrollStart = Date.now();
  let consumedTime = 0;
  // 200ms内滚动至目标位置
  while (consumedTime < scrollTime) {
    scrollContainer.scrollTop =
      containerScrollTop +
      (consumedTime / scrollTime) * (changedScrollTop - containerScrollTop);
    await requestAnimationFrameAsync();
    consumedTime = Date.now() - scrollStart;
  }
  scrollContainer.scrollTop = getTargetScrollTop();
  scrollContainer.style.scrollBehavior = originScrollBehavior;
};

const toScrollSmooth = async (
  scrollContainer: HTMLElement,
  getTargetScrollTop: () => number
) =>
  new Promise<void>((resolve) => {
    const changedScrollTop = getTargetScrollTop();
    scrollContainer.scrollTop = changedScrollTop;
    const scrollComplete = debounce(() => {
      // the scrolling is considered complete when there are no scroll events within 50 ms (about 3 frames).
      resolve();
      scrollContainer.removeEventListener("scroll", scrollComplete);
    }, 50);
    scrollContainer.addEventListener("scroll", scrollComplete);
  });

export const scrollSmooth = async (
  scrollContainer: HTMLElement,
  scrollTop: number | (() => number),
  scrollTime = 300
) => {
  if (scrollContainer) {
    const getTargetScrollTop = () =>
      isFunction(scrollTop) ? scrollTop() : scrollTop;
    return (
      typeof getComputedStyle === "function" &&
        getComputedStyle(scrollContainer).scrollBehavior === "smooth"
        ? toScrollSmooth
        : toScrollAuto
    )(scrollContainer, getTargetScrollTop, scrollTime);
  }
};
