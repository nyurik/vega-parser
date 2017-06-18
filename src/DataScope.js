import {entry, ref, keyFieldRef, aggrField, sortKey} from './util';
import {Aggregate, Collect} from './transforms';
import {isString} from 'vega-util';

export default function DataScope(scope, input, output, values, aggr) {
  this.scope = scope;   // parent scope object
  this.input = input;   // first operator in pipeline (tuple input)
  this.output = output; // last operator in pipeline (tuple output)
  this.values = values; // operator for accessing tuples (but not tuple flow)

  // last aggregate in transform pipeline
  this.aggregate = aggr;

  // lookup table of field indices
  this.index = {};
}

DataScope.fromEntries = function(scope, entries) {
  const n = entries.length,
    input = entries[0],
    values = entries[n - 1],
    output = entries[n - 2];

  let aggr = null;

  // add operator entries to this scope, wire up pulse chain
  scope.add(entries[0]);
  for (let i = 1; i < n; ++i) {
    entries[i].params.pulse = ref(entries[i - 1]);
    scope.add(entries[i]);
    if (entries[i].type === 'Aggregate') aggr = entries[i];
  }

  return new DataScope(scope, input, output, values, aggr);
};

const prototype = DataScope.prototype;

prototype.countsRef = function(scope, field, sort) {
  const ds = this,
    cache = ds.counts || (ds.counts = {}),
    k = fieldKey(field);
  let v;

  if (k !== null) {
    scope = ds.scope;
    v = cache[k];
  }

  if (!v) {
    let p = {
      groupby: scope.fieldRef(field, 'key'),
      pulse: ref(ds.output)
    };
    if (sort && sort.field) addSortField(scope, p, sort);

    let aggr = scope.add(Aggregate(p));
    v = scope.add(Collect({pulse: ref(aggr)}));
    v = {agg: aggr, ref: ref(v)};
    if (k !== null) {
      cache[k] = v;
    }
  } else if (sort && sort.field) {
    addSortField(scope, v.agg.params, sort);
  }

  return v.ref;
};

function fieldKey(field) {
  return isString(field) ? field : null;
}

function addSortField(scope, p, sort) {
  const as = aggrField(sort.op, sort.field);

  if (p.ops) {
    for (let i = 0, n = p.as.length; i < n; ++i) {
      if (p.as[i] === as) return;
    }
  } else {
    p.ops = ['count'];
    p.fields = [null];
    p.as = ['count'];
  }
  if (sort.op) {
    let s = sort.op.signal;
    p.ops.push(s ? scope.signalRef(s) : sort.op);
    p.fields.push(scope.fieldRef(sort.field));
    p.as.push(as);
  }
}

function cache(scope, ds, name, optype, field, counts, index) {
  const cache = ds[name] || (ds[name] = {}),
      sort = sortKey(counts);

  let k = fieldKey(field), v;

  if (k != null) {
    scope = ds.scope;
    k = k + (sort ? '|' + sort : '');
    v = cache[k];
  }

  if (!v) {
    const params = counts
      ? {field: keyFieldRef, pulse: ds.countsRef(scope, field, counts)}
      : {field: scope.fieldRef(field), pulse: ref(ds.output)};
    if (sort) params.sort = scope.sortRef(counts);
    let op = scope.add(entry(optype, undefined, params));
    if (index) ds.index[field] = op;
    v = ref(op);
    if (k !== null) cache[k] = v;
  }

  return v;
}

prototype.tuplesRef = function() {
  return ref(this.values);
};

prototype.extentRef = function(scope, field) {
  return cache(scope, this, 'extent', 'Extent', field, false);
};

prototype.domainRef = function(scope, field) {
  return cache(scope, this, 'domain', 'Values', field, false);
};

prototype.valuesRef = function(scope, field, sort) {
  return cache(scope, this, 'vals', 'Values', field, sort || true);
};

prototype.lookupRef = function(scope, field) {
  return cache(scope, this, 'lookup', 'TupleIndex', field, false);
};

prototype.indataRef = function(scope, field) {
  return cache(scope, this, 'indata', 'TupleIndex', field, true, true);
};
