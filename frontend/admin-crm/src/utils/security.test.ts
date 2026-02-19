import { describe, it, expect } from "vitest";
import {
  sanitizeHTML,
  sanitizeCSS,
  escapeHTML,
  sanitizeURL,
  getSecurityHeaders,
} from "./security";

describe("sanitizeHTML", () => {
  describe("strict mode (default)", () => {
    it("allows basic formatting tags", () => {
      const html = "<p>Hello <strong>world</strong> <em>italic</em></p>";
      const result = sanitizeHTML(html);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
    });

    it("strips script tags", () => {
      const html = '<p>Safe</p><script>alert("xss")</script>';
      const result = sanitizeHTML(html);
      expect(result).not.toContain("<script>");
      expect(result).toContain("Safe");
    });

    it("removes onclick attributes", () => {
      const html = '<p onclick="alert(1)">Click me</p>';
      const result = sanitizeHTML(html);
      expect(result).not.toContain("onclick");
    });

    it("removes javascript: URLs", () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHTML(html, "strict");
      expect(result).not.toContain("javascript:");
    });

    it("strips disallowed tags like table, a, img", () => {
      const html =
        '<table><tr><td>data</td></tr></table><a href="#">link</a><img src="x">';
      const result = sanitizeHTML(html, "strict");
      expect(result).not.toContain("<table");
      expect(result).not.toContain("<a");
      expect(result).not.toContain("<img");
    });
  });

  describe("email mode", () => {
    it("allows table, a, img tags", () => {
      const html =
        '<table><tr><td>data</td></tr></table><a href="https://example.com">link</a>';
      const result = sanitizeHTML(html, "email");
      expect(result).toContain("<table>");
      expect(result).toContain("<a");
    });

    it("adds target=_blank to links", () => {
      const html = '<a href="https://example.com">link</a>';
      const result = sanitizeHTML(html, "email");
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });
  });

  describe("template mode", () => {
    it("allows pre and code tags", () => {
      const html = "<pre><code>const x = 1;</code></pre>";
      const result = sanitizeHTML(html, "template");
      expect(result).toContain("<pre>");
      expect(result).toContain("<code>");
    });
  });

  describe("preview mode", () => {
    it("allows mark, del, ins tags", () => {
      const html =
        "<mark>highlighted</mark><del>deleted</del><ins>inserted</ins>";
      const result = sanitizeHTML(html, "preview");
      expect(result).toContain("<mark>");
      expect(result).toContain("<del>");
      expect(result).toContain("<ins>");
    });

    it("allows colspan and rowspan attributes", () => {
      const html =
        '<table><tr><td colspan="2" rowspan="3">cell</td></tr></table>';
      const result = sanitizeHTML(html, "preview");
      expect(result).toContain("colspan");
      expect(result).toContain("rowspan");
    });
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHTML("")).toBe("");
  });

  it("returns empty string for null-like input", () => {
    expect(sanitizeHTML(null as unknown as string)).toBe("");
    expect(sanitizeHTML(undefined as unknown as string)).toBe("");
  });
});

describe("sanitizeCSS", () => {
  it("removes javascript: from CSS", () => {
    expect(sanitizeCSS("background: javascript:void(0)")).not.toContain(
      "javascript:",
    );
  });

  it("removes expression()", () => {
    expect(sanitizeCSS("width: expression(100)")).not.toContain("expression");
  });

  it("removes @import", () => {
    expect(sanitizeCSS('@import url("evil.css")')).not.toContain("@import");
  });

  it("removes url(data:...)", () => {
    expect(
      sanitizeCSS("background: url(data:text/html,<script>)"),
    ).not.toContain("url");
  });

  it("removes binding/-moz-binding/behavior", () => {
    expect(sanitizeCSS("binding: url(evil)")).not.toContain("binding:");
    expect(sanitizeCSS("-moz-binding: url(evil)")).not.toContain(
      "-moz-binding",
    );
    expect(sanitizeCSS("behavior: url(evil)")).not.toContain("behavior:");
  });

  it("preserves valid CSS", () => {
    const css = "color: red; font-size: 14px; margin: 10px;";
    expect(sanitizeCSS(css)).toBe(css);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeCSS("")).toBe("");
  });
});

describe("escapeHTML", () => {
  it("escapes &", () => {
    expect(escapeHTML("a & b")).toContain("&amp;");
  });

  it("escapes < and >", () => {
    expect(escapeHTML("<script>")).toContain("&lt;");
    expect(escapeHTML("<script>")).toContain("&gt;");
  });

  it("escapes quotes", () => {
    expect(escapeHTML('"hello"')).toContain("&quot;");
    expect(escapeHTML("'hello'")).toContain("&#39;");
  });

  it("escapes forward slash", () => {
    expect(escapeHTML("a/b")).toContain("&#47;");
  });

  it("preserves normal text", () => {
    expect(escapeHTML("Hello World")).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHTML("")).toBe("");
  });
});

describe("sanitizeURL", () => {
  it("allows https URLs", () => {
    expect(sanitizeURL("https://example.com")).toBe("https://example.com/");
  });

  it("allows http URLs", () => {
    expect(sanitizeURL("http://example.com")).toBe("http://example.com/");
  });

  it("allows mailto URLs", () => {
    expect(sanitizeURL("mailto:user@example.com")).toBe(
      "mailto:user@example.com",
    );
  });

  it("allows tel URLs", () => {
    expect(sanitizeURL("tel:+1234567890")).toBe("tel:+1234567890");
  });

  it("rejects javascript: URLs", () => {
    expect(sanitizeURL("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: URLs", () => {
    expect(sanitizeURL("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects ftp: URLs", () => {
    expect(sanitizeURL("ftp://example.com")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(sanitizeURL("not a url")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeURL("")).toBeNull();
  });
});

describe("getSecurityHeaders", () => {
  it("returns expected security headers", () => {
    const headers = getSecurityHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
