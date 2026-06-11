import fs from "fs";
import path from "path";

const dbPath = path.resolve("mock_db.json");

function loadDb() {
  if (fs.existsSync(dbPath)) {
    try {
      return JSON.parse(fs.readFileSync(dbPath, "utf8"));
    } catch (e) {
      console.error("Error reading mock DB file, returning empty database:", e);
      return {};
    }
  }
  return {};
}

function saveDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing to mock DB file:", e);
  }
}

function wrapDoc(item, modelInstance) {
  if (!item) return null;
  return new Proxy(item, {
    get(target, prop) {
      if (prop === "save") {
        return async function () {
          const items = modelInstance._getCollection();
          const index = items.findIndex((x) => x._id === target._id);

          // Sync current property values of proxy to target
          const updated = { ...target };
          if (index !== -1) {
            items[index] = updated;
          } else {
            items.push(updated);
          }
          modelInstance._saveCollection(items);
          return wrapDoc(updated, modelInstance);
        };
      }
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
}

export class MockModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  _getCollection() {
    const db = loadDb();
    if (!db[this.collectionName]) {
      db[this.collectionName] = [];
      saveDb(db);
    }
    return db[this.collectionName];
  }

  _saveCollection(items) {
    const db = loadDb();
    db[this.collectionName] = items;
    saveDb(db);
  }

  _matches(item, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const key of Object.keys(query)) {
      const val = query[key];
      if (val && typeof val === "object" && "$in" in val) {
        const itemVal = item[key] !== undefined ? String(item[key]) : "";
        if (!val.$in.map(String).includes(itemVal)) return false;
      } else {
        if (item[key] === undefined || String(item[key]) !== String(val)) {
          return false;
        }
      }
    }
    return true;
  }

  createInstance(data = {}) {
    const doc = { _id: Math.random().toString(36).substr(2, 9), ...data };
    return wrapDoc(doc, this);
  }

  async countDocuments(query = {}) {
    const items = this._getCollection();
    const matched = items.filter((x) => this._matches(x, query));
    return matched.length;
  }

  async find(query = {}) {
    const items = this._getCollection();
    const matched = items.filter((x) => this._matches(x, query));
    const wrapped = matched.map((x) => wrapDoc(x, this));

    // Support sorting and limits on returned array
    wrapped.sort = (sortObj) => {
      const field = Object.keys(sortObj)[0];
      const order = sortObj[field]; // 1 or -1
      wrapped.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        if (field === "_id") {
          valA = a._id;
          valB = b._id;
        }
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
      return wrapped;
    };

    wrapped.limit = (n) => {
      const sliced = wrapped.slice(0, n);
      sliced.sort = wrapped.sort; // preserve chain sort capability
      return sliced;
    };

    return wrapped;
  }

  async findOne(query = {}) {
    const items = this._getCollection();
    const matched = items.find((x) => this._matches(x, query));
    return matched ? wrapDoc(matched, this) : null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async create(data) {
    const items = this._getCollection();
    if (Array.isArray(data)) {
      const docs = data.map((d) => ({
        _id: Math.random().toString(36).substr(2, 9),
        ...d
      }));
      items.push(...docs);
      this._saveCollection(items);
      return docs.map((d) => wrapDoc(d, this));
    } else {
      const doc = {
        _id: Math.random().toString(36).substr(2, 9),
        ...data
      };
      items.push(doc);
      this._saveCollection(items);
      return wrapDoc(doc, this);
    }
  }

  async findOneAndUpdate(query, update, options = {}) {
    const items = this._getCollection();
    const index = items.findIndex((x) => this._matches(x, query));
    if (index === -1) return null;

    const item = items[index];

    // Apply incremental operator
    if (update.$inc) {
      for (const key of Object.keys(update.$inc)) {
        item[key] = (item[key] || 0) + update.$inc[key];
      }
    }

    // Apply set operator
    if (update.$set) {
      for (const key of Object.keys(update.$set)) {
        item[key] = update.$set[key];
      }
    }

    // Apply regular properties updates
    for (const key of Object.keys(update)) {
      if (key !== "$inc" && key !== "$set") {
        item[key] = update[key];
      }
    }

    items[index] = item;
    this._saveCollection(items);
    return wrapDoc(item, this);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  async deleteOne(query) {
    const items = this._getCollection();
    const index = items.findIndex((x) => this._matches(x, query));
    if (index !== -1) {
      items.splice(index, 1);
      this._saveCollection(items);
    }
    return { deletedCount: index !== -1 ? 1 : 0 };
  }

  async deleteMany(query) {
    const items = this._getCollection();
    let deletedCount = 0;
    const remaining = items.filter((x) => {
      const isMatch = this._matches(x, query);
      if (isMatch) deletedCount++;
      return !isMatch;
    });
    this._saveCollection(remaining);
    return { deletedCount };
  }

  async updateMany(query, update) {
    const items = this._getCollection();
    let modifiedCount = 0;
    items.forEach((x) => {
      if (this._matches(x, query)) {
        modifiedCount++;
        for (const key of Object.keys(update)) {
          x[key] = update[key];
        }
      }
    });
    this._saveCollection(items);
    return { modifiedCount };
  }
}
