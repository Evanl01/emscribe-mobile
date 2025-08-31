// JSON formatting utility function (adapted from web version)
export const printJsonObject = (obj, level = 0) => {
  const indent = (lvl) => ' '.repeat(lvl * 3);
  if (typeof obj === 'string' || typeof obj === 'number') {
    // Split by \n and add indent to each line
    return String(obj)
      .split('\n')
      .map(line => indent(level) + line)
      .join('\n');
  } else if (Array.isArray(obj)) {
    return obj.map(item => printJsonObject(item, level + 1)).join('\n');
  } else if (typeof obj === 'object' && obj !== null) {
    let result = '';
    for (const [key, value] of Object.entries(obj)) {
      result += indent(level) + key + ':\n';
      result += printJsonObject(value, level + 1) + '\n';
    }
    return result.trim();
  }
  return indent(level) + String(obj);
};