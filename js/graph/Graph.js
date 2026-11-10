function edgeKey(u, v) {
  return u < v ? `${u}|${v}` : `${v}|${u}`;
}

export class Graph {
  constructor() {
    this.ids = new Set();
    this.adj = new Map();
    this.weights = new Map();
  }

  addNode(id) {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    this.adj.set(id, []);
  }

  addEdge(u, v, weight) {
    this.addNode(u);
    this.addNode(v);
    const key = edgeKey(u, v);
    if (this.weights.has(key)) return;
    this.weights.set(key, weight);
    this.adj.get(u).push(v);
    this.adj.get(v).push(u);
  }

  hasEdge(u, v) {
    return this.weights.has(edgeKey(u, v));
  }

  neighbors(id) {
    return [...(this.adj.get(id) || [])];
  }

  weight(u, v) {
    const value = this.weights.get(edgeKey(u, v));
    if (value == null) throw new Error(`No hay arista entre ${u} y ${v}`);
    return value;
  }

  setWeight(u, v, weight) {
    const key = edgeKey(u, v);
    if (!this.weights.has(key)) throw new Error(`No hay arista entre ${u} y ${v}`);
    this.weights.set(key, weight);
  }

  nodeIds() {
    return [...this.ids];
  }

  edges() {
    const list = [];
    for (const [key, w] of this.weights) {
      const [u, v] = key.split("|");
      list.push({ u, v, w });
    }
    return list;
  }
}
