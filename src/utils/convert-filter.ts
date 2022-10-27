import { flat } from 'adminjs'
import escape from 'escape-regexp'
import mongoose from 'mongoose'

/**
 * Changes AdminJS's {@link Filter} to an object acceptible by a mongoose query.
 *
 * @param {Filter} filter
 * @private
 */
export const convertFilter = (filter) => {
  if (!filter) {
    return {}
  }

  const filters = flat.unflatten(filter.filters)
  Object.keys(filters).forEach((key) => {
    if (!Array.isArray(filters[key])) return;

    const reg = new RegExp(`^${escape(key)}.[0-9]+`);
    Object.keys(filter.filters).forEach(oldKey => {
      if (reg.test(oldKey)) delete filter.filters[oldKey];
    })

    filter.filters[key] = {
      path: key,
      value: filters[key].map(f => f.value),
    };
  });

  return filter.reduce((memo, filterProperty) => {
    const { property, path, value } = filterProperty

    if (!property && path) {
      return {
        [path]: { $in: value },
        ...memo,
      }
    }

    switch (property.type()) {
    case 'string':
      if (typeof value === 'object') {
        if (value.equal) {
          return {
            [property.name()]: { $regex: `^${escape(value.equal)}$`, $options: 'i' },
            ...memo,
          }
        }

        if (value.start_with) {
          return {
            [property.name()]: { $regex: `^${escape(value.start_with)}`, $options: 'i' },
            ...memo,
          }
        }

        if (value.end_with) {
          return {
            [property.name()]: { $regex: `${escape(value.end_with)}$`, $options: 'i' },
            ...memo,
          }
        }

        if (value.contains) {
          return {
            [property.name()]: { $regex: escape(value.contains), $options: 'i' },
            ...memo,
          }
        }

        return {
          [property.name()]: { $regex: '', $options: 'i' },
          ...memo,
        }
      }

      return {
        [property.name()]: { $regex: escape(value), $options: 'i' },
        ...memo,
      }
    case 'date':
    case 'datetime':
      if (value.from || value.to) {
        return {
          [property.name()]: {
            ...value.from && { $gte: value.from },
            ...value.to && { $lte: value.to },
          },
          ...memo,
        }
      }
      break
    case 'id':
      if (mongoose.Types.ObjectId.isValid(value)) {
        return {
          [property.name()]: value,
          ...memo,
        }
      }
      return {}
    default:
      break
    }
    return {
      [property.name()]: value,
      ...memo,
    }
  }, {})
}
