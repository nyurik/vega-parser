import definition from './marks/definition';
import dataName from './marks/data-name';
import parseData from './marks/data';
import parseFacet from './marks/facet';
import parseSubflow from './marks/subflow';
import getRole from './marks/role';
import {GroupMark} from './marks/marktypes';
import {FrameRole, MarkRole, ScopeRole} from './marks/roles';
import {encoders} from './encode/encode-util';
import parseTransform from './transform';
import parseTrigger from './trigger';
import parseSpec from './spec';
import DataScope from '../DataScope';
import {fieldRef, ref} from '../util';
import {error} from 'vega-util';
import {Bound, Collect, DataJoin, Mark, Encode, Overlap, Render, Sieve, SortItems, ViewLayout} from '../transforms';

export default function(spec, scope) {
  var role = getRole(spec),
      group = spec.type === GroupMark,
      facet = spec.from && spec.from.facet,
      layout = spec.layout || role === ScopeRole || role === FrameRole,
      nested = role === MarkRole || layout || facet,
      ops, op, input, store, bound, render, sieve, name,
      joinRef, markRef, encodeRef, layoutRef, boundRef;

  // resolve input data
  input = parseData(spec.from, group, scope);

  // data join to map tuples to visual items
  op = scope.add(DataJoin({
    key:   input.key || (spec.key ? fieldRef(spec.key) : undefined),
    pulse: input.pulse,
    clean: !group
  }));
  joinRef = ref(op);

  // collect visual items
  op = store = scope.add(Collect({pulse: joinRef}));

  // connect visual items to scenegraph
  op = scope.add(Mark({
    markdef:   definition(spec),
    context:   {$context: true},
    groups:    scope.lookup(),
    parent:    scope.signals.parent ? scope.signalRef('parent') : null,
    index:     scope.markpath(),
    pulse:     ref(op)
  }));
  markRef = ref(op);

  // add visual encoders
  op = scope.add(Encode(
    encoders(spec.encode, spec.type, role, scope, {pulse: markRef})
  ));

  // monitor parent marks to propagate changes
  op.params.parent = scope.encode();

  // add post-encoding transforms, if defined
  if (spec.transform) {
    spec.transform.forEach(function(_) {
      var tx = parseTransform(_, scope);
      if (tx.metadata.generates || tx.metadata.changes) {
        error('Mark transforms should not generate new data.');
      }
      tx.params.pulse = ref(op);
      scope.add(op = tx);
    });
  }

  // if item sort specified, perform post-encoding
  if (spec.sort) {
    op = scope.add(SortItems({
      sort:  scope.compareRef(spec.sort),
      pulse: ref(op)
    }));
  }

  encodeRef = ref(op);

  // add view layout operator if needed
  if (facet || layout) {
    layout = scope.add(ViewLayout({
      layout:       scope.objectProperty(spec.layout),
      legendMargin: scope.config.legendMargin,
      mark:         markRef,
      pulse:        encodeRef
    }));
    layoutRef = ref(layout);
  }

  // compute bounding boxes
  bound = scope.add(Bound({mark: markRef, pulse: layoutRef || encodeRef}));
  boundRef = ref(bound);

  // if group mark, recurse to parse nested content
  if (group) {
    // juggle layout & bounds to ensure they run *after* any faceting transforms
    if (nested) { ops = scope.operators; ops.pop(); if (layout) ops.pop(); }

    scope.pushState(encodeRef, layoutRef || boundRef, joinRef);
    facet ? parseFacet(spec, scope, input)          // explicit facet
        : nested ? parseSubflow(spec, scope, input) // standard mark group
        : parseSpec(spec, scope); // guide group, we can avoid nested scopes
    scope.popState();

    if (nested) { if (layout) ops.push(layout); ops.push(bound); }
  }

  if (spec.overlap) {
    boundRef = ref(scope.add(Overlap({
      method: spec.overlap === true ? 'parity' : spec.overlap,
      pulse:  boundRef
    })));
  }

  // render / sieve items
  render = scope.add(Render({pulse: boundRef}));
  sieve = scope.add(Sieve({pulse: boundRef}, undefined, scope.parent()));

  // if mark is named, make accessible as reactive geometry
  // add trigger updates if defined
  if (spec.name != null) {
    name = dataName(spec.name);
    scope.addData(name, new DataScope(scope, store, render, sieve));
    if (spec.on) spec.on.forEach(function(on) {
      if (on.insert || on.remove || on.toggle) {
        error('Marks only support modify triggers.');
      }
      parseTrigger(on, scope, name);
    });
  }
}
