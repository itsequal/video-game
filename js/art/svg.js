export const NS = "http://www.w3.org/2000/svg";

export function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) node.setAttribute(key, String(value));
  }
  if (parent) parent.appendChild(node);
  return node;
}
