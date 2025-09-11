import { useEffect, useRef, useState, useCallback } from 'react';

export interface IntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
}

export interface IntersectionObserverEntry {
  isIntersecting: boolean;
  target: Element;
  intersectionRatio: number;
  boundingClientRect: DOMRectReadOnly;
  intersectionRect: DOMRectReadOnly;
  rootBounds: DOMRectReadOnly | null;
  time: number;
}

/**
 * Custom hook for using IntersectionObserver API
 * Provides a way to asynchronously observe changes in the intersection of a target element
 */
export const useIntersectionObserver = (
  options: IntersectionObserverOptions = {}
) => {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([]);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<Element>>(new Set());

  // Check if IntersectionObserver is supported
  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'IntersectionObserver' in window);
  }, []);

  // Initialize observer
  useEffect(() => {
    if (!isSupported) return;

    const { threshold = 0, root = null, rootMargin = '0px' } = options;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        setEntries(observerEntries.map(entry => ({
          isIntersecting: entry.isIntersecting,
          target: entry.target,
          intersectionRatio: entry.intersectionRatio,
          boundingClientRect: entry.boundingClientRect,
          intersectionRect: entry.intersectionRect,
          rootBounds: entry.rootBounds,
          time: entry.time,
        })));
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [isSupported, options.threshold, options.root, options.rootMargin]);

  // Observe element
  const observe = useCallback((element: Element | null) => {
    if (!element || !observerRef.current || !isSupported) return;

    observerRef.current.observe(element);
    elementsRef.current.add(element);
  }, [isSupported]);

  // Unobserve element
  const unobserve = useCallback((element: Element | null) => {
    if (!element || !observerRef.current || !isSupported) return;

    observerRef.current.unobserve(element);
    elementsRef.current.delete(element);
  }, [isSupported]);

  // Disconnect all observations
  const disconnect = useCallback(() => {
    if (!observerRef.current || !isSupported) return;

    observerRef.current.disconnect();
    elementsRef.current.clear();
    setEntries([]);
  }, [isSupported]);

  return {
    entries,
    observe,
    unobserve,
    disconnect,
    isSupported,
  };
};

/**
 * Hook for observing a single element
 */
export const useIntersectionObserverSingle = (
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverOptions = {}
) => {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);

  const { entries, observe, unobserve, isSupported } = useIntersectionObserver(options);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observe(element);

    return () => {
      unobserve(element);
    };
  }, [elementRef, observe, unobserve]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const elementEntry = entries.find(e => e.target === element);
    if (elementEntry) {
      setEntry(elementEntry);
      setIsIntersecting(elementEntry.isIntersecting);
    }
  }, [entries, elementRef]);

  return {
    entry,
    isIntersecting,
    isSupported,
  };
};

export default useIntersectionObserver;