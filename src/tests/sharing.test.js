import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createActivitySharing, getActivityId } from "../static/sharing.js";

function createElement(tagName) {
  const element = {
    tagName,
    children: [],
    attributes: {},
    className: "",
    appendChild(child) { this.children.push(child); },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this[name] = callback; },
    focus() { this.focused = true; },
    select() { this.selected = true; },
  };
  element.classList = {
    add(name) { element.className += ` ${name}`; },
    remove(name) {
      element.className = element.className.split(" ").filter((item) => item !== name).join(" ");
    },
  };
  return element;
}

let originalGlobals;
beforeEach(() => {
  originalGlobals = ["document", "window", "navigator"].map((name) => [
    name, Object.getOwnPropertyDescriptor(globalThis, name),
  ]);
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: { createElement } },
    window: {
      configurable: true,
      value: {
        location: new URL("https://school.example/static/index.html?day=Monday&email=private@example.com#old"),
      },
    },
    navigator: { configurable: true, value: {} },
  });
});

afterEach(() => {
  originalGlobals.forEach(([name, descriptor]) => {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete globalThis[name];
    }
  });
});

test("sharing preserves special activity names and excludes page parameters", () => {
  const name = "Art & Music / 日本語 #1";
  const sharing = createActivitySharing(name);
  const links = sharing.children.filter((child) => child.tagName === "a");
  assert.equal(links.length, 3);

  const activityUrl = new URL(links[0].href).searchParams.get("u");
  const url = new URL(activityUrl);
  assert.equal(url.origin, "https://school.example");
  assert.equal(url.pathname, "/static/index.html");
  assert.equal(url.search, "");
  assert.equal(decodeURIComponent(url.hash.slice(1)), getActivityId(name));
  assert.equal(decodeURIComponent(decodeURIComponent(url.hash.slice("#activity-".length))), name);

  const whatsapp = new URL(links[1].href).searchParams.get("text");
  const email = new URL(links[2].href);
  assert.equal(whatsapp, `Check out ${name} at Mergington High School! ${activityUrl}`);
  assert.equal(email.searchParams.get("subject"), `${name} at Mergington High School`);
  assert.equal(email.searchParams.get("body"), `Check out ${name} at Mergington High School!\n${activityUrl}`);
  assert.equal(sharing.attributes["aria-label"], `Share ${name}`);

  for (const link of links.slice(0, 2)) {
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.ok(!link.href.includes("private"));
  }
});

test("copy link reports success only after copying the activity URL", async () => {
  let copied;
  navigator.clipboard = { async writeText(value) { copied = value; } };
  const sharing = createActivitySharing("Chess Club");
  const button = sharing.children.find((child) => child.tagName === "button");
  await button.click();
  assert.equal(copied, "https://school.example/static/index.html#activity-Chess%2520Club");
  assert.equal(sharing.children.at(-1).textContent, "Link copied!");
});

test("unavailable clipboard displays and selects a manually copyable link", async () => {
  const sharing = createActivitySharing("Chess Club");
  await sharing.children.find((child) => child.tagName === "button").click();
  const input = sharing.children.find((child) => child.tagName === "input");
  assert.ok(!input.className.includes("hidden"));
  assert.equal(input.readOnly, true);
  assert.equal(input.value, "https://school.example/static/index.html#activity-Chess%2520Club");
  assert.equal(input.focused, true);
  assert.equal(input.selected, true);
  assert.match(sharing.children.at(-1).textContent, /Automatic copying is unavailable/);
});

test("denied clipboard access offers manual copying instead of reporting success", async (t) => {
  const denied = new Error("Permission denied");
  navigator.clipboard = { async writeText() { throw denied; } };
  const errors = t.mock.method(console, "error", () => {});
  const sharing = createActivitySharing("Chess Club");
  await sharing.children.find((child) => child.tagName === "button").click();
  assert.equal(errors.mock.calls.length, 1);
  assert.equal(errors.mock.calls[0].arguments[1], denied);
  assert.ok(!sharing.children.find((child) => child.tagName === "input").className.includes("hidden"));
  assert.match(sharing.children.at(-1).textContent, /Automatic copying is unavailable/);
});
