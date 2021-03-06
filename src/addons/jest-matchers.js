import Microcosm, { Action, tag, get, getRegistration } from '../microcosm'

expect.extend({

  toRegister (entity, behavior, status = 'done') {
    let tagged = tag(behavior)
    let name = behavior.name || tagged.toString()

    let operator = this.isNot ? 'not to' : 'to'
    let pass = getRegistration(entity, behavior, status) != null

    return {
      pass: pass,
      message: () => {
        return `Expected entity ${operator} register to the "${status}" state of ${name}.`
      }
    }
  },

  toHaveStatus (action, status) {
    if (action instanceof Action === false) {
      throw new TypeError("toHaveStatus expects an Action. Received " +
                          (action != null ? "a " + action.constructor.name : action) + ".")
    }

    let operator = this.isNot ? 'not to' : 'to'
    let pass = action.is(status)

    return {
      pass: pass,
      message: () => {
        return `Expected action ${operator} to be"${status}".`
      }
    }
  },

  toHaveState (repo, key, value) {
    if (repo instanceof Microcosm === false) {
      throw new TypeError("toHaveState expects a Microcosm. Received " +
                           (repo != null ? "a " + repo.constructor.name : repo) + ".")
    }

    let operator = this.isNot ? 'not to' : 'to'
    let pass = false
    let actual = get(repo.state, key)

    if (arguments.length > 2) {
      pass = actual === value
    } else {
      pass = actual !== undefined
    }

    return {
      pass: pass,
      message: () => {
        return `Expected repo state at "${key}" ${operator} be ${value}. Found ${actual}.`
      }
    }
  }

})
