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
  return filter.reduce((memo, filterProperty) => {
    const { property, value } = filterProperty
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
