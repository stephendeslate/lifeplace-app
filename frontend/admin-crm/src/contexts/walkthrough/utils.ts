// frontend/admin-crm/src/contexts/walkthrough/utils.ts

/**
 * Find a target element by CSS selector, optionally waiting for it to appear in the DOM.
 */
export const findTargetElement = async (
  selector: string,
  waitFor: boolean = false,
): Promise<HTMLElement | null> => {
  const find = () => document.querySelector<HTMLElement>(selector);

  if (!waitFor) {
    return find();
  }

  // Wait up to 3 seconds for element to appear
  return new Promise((resolve) => {
    const element = find();
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = find();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(find());
    }, 3000);
  });
};
