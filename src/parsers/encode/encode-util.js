import parseEncode from '../encode';
import {FrameRole, MarkRole} from '../marks/roles';
import {extend, isObject} from 'vega-util';

export function encoder(_) {
  return isObject(_) ? _ : {value: _};
}

export function addEncode(object, name, value) {
  if (value != null) {
    object[name] = {value: value};
    return 1;
  } else {
    return 0;
  }
}

export function extendEncode(encode, extra, skip) {
  for (let name of Object.keys(extra)) {
    if (skip && skip.hasOwnProperty(name)) continue;
    encode[name] = extend(encode[name] || {}, extra[name]);
  }
  return encode;
}

export function encoders(encode, type, role, scope, params) {
  const enc = {};

  params = params || {};
  params.encoders = {$encode: enc};

  encode = applyDefaults(encode, type, role, scope.config);

  for (let key of Object.keys(encode)) {
    enc[key] = parseEncode(encode[key], type, params, scope);
  }

  return params;
}

function applyDefaults(encode, type, role, config) {
  // ignore legend and axis
  if (role === 'legend' || String(role).indexOf('axis') === 0) {
    role = null;
  }

  config = role === FrameRole ? config.group
    : (role === MarkRole || config[type = role]) ? extend({}, config.mark, config[type])
    : {};

  const enter = {};
  for (let key of Object.keys(config)) {
    // do not apply defaults if relevant fields are defined
    const skip = has(key, encode)
      || (key === 'fill' || key === 'stroke')
      && (has('fill', encode) || has('stroke', encode));

    if (!skip) enter[key] = {value: config[key]};
  }

  encode = extend({}, encode); // defensive copy
  encode.enter = extend(enter, encode.enter);

  return encode;
}

export function has(key, encode) {
  return (encode.enter && encode.enter[key])
    || (encode.update && encode.update[key]);
}
