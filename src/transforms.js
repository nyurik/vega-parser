import {entry} from './util';

function transform(name) {
  return function(params, value, parent) {
    return entry(name, value, params || undefined, parent);
  };
}

export const Aggregate = transform('Aggregate');
export const AxisTicks = transform('AxisTicks');
export const Bound = transform('Bound');
export const Collect = transform('Collect');
export const Compare = transform('Compare');
export const DataJoin = transform('DataJoin');
export const Encode = transform('Encode');
export const Extent = transform('Extent');
export const Facet = transform('Facet');
export const Field = transform('Field');
export const Key = transform('Key');
export const LegendEntries = transform('LegendEntries');
export const Mark = transform('Mark');
export const MultiExtent = transform('MultiExtent');
export const MultiValues = transform('MultiValues');
export const Overlap = transform('Overlap');
export const Params = transform('Params');
export const PreFacet = transform('PreFacet');
export const Projection = transform('Projection');
export const Proxy = transform('Proxy');
export const Relay = transform('Relay');
export const Render = transform('Render');
export const Scale = transform('Scale');
export const Sieve = transform('Sieve');
export const SortItems = transform('SortItems');
export const ViewLayout = transform('ViewLayout');
export const Values = transform('Values');
