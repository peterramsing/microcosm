import Microcosm, { merge, get, tag, inherit } from '../microcosm'
import { Children, PropTypes, Component, PureComponent, createElement } from 'react'

const EMPTY = {}

/**
 * PureComponent was only added recently, so fallback to the regular
 * component in cases where it doesn't exist
 */
const BaseComponent = PureComponent || Component

function Presenter (props, context) {
  BaseComponent.apply(this, arguments)

  // Do not overriding render, generate the context wrapper upon creation
  if (this.view === Presenter.prototype.view && this.render !== Presenter.prototype.render) {
    this.view = this.render.bind(this)
    this.render = Presenter.prototype.render.bind(this)
  }
}

inherit(Presenter, BaseComponent, {

  getRepo (repo, props) {
    return repo ? repo.fork() : new Microcosm()
  },

  _setRepo (repo) {
    this.repo = repo

    this.setup(repo, this.props, this.props.state)
  },

  _connectSend (send) {
    this.send = send
  },

  /**
   * Called when a presenter is created, before it has calculated a view model.
   * Useful for fetching data and other prep-work.
   */
  setup (repo, props, state) {
    // NOOP
  },

  /**
   * Called when a presenter gets new props. This is useful for secondary
   * data fetching and other work that must happen when a Presenter receives
   * new information
   */
  update (repo, props, state) {
    // NOOP
  },

  componentWillUpdate (next, state) {
    this.update(this.repo, next, state)
  },

  /**
   * Opposite of setup. Useful for cleaning up side-effects.
   */
  teardown (repo, props, state) {
    // NOOP
  },

  /**
   * Expose "intent" subscriptions to child components. This is used with the <Form />
   * add-on to improve the ergonomics of presenter/view communication (though this only
   * occurs from the view to the presenter).
   */
  register () {
    // NOOP
  },

  /**
   * Used by the presenter to calculate it's internal state. This function must return
   * an object who's keys will be assigned to state, and who's values are functions that
   * are given the repo state and can return a specific point in that state.
   *
   * If none of the keys have changed, `this.updateState` will not set a new state.
   */
  getModel (props, state, repo) {
    return EMPTY
  },

  view (model) {
    return this.props.children ? Children.only(this.props.children) : null
  },

  render () {
    return (
      createElement(PresenterContext, {
        parentProps : this.props,
        parentState : this.state,
        presenter   : this,
        view        : this.view,
        repo        : this.props.repo
      })
    )
  }
})

function PresenterContext (props, context) {
  BaseComponent.apply(this, arguments)

  this.repo = this.getRepo()
  this.state = {}
  this.send = this.send.bind(this)

  props.presenter._connectSend(this.send)
}

inherit(PresenterContext, BaseComponent, {

  getChildContext () {
    return {
      repo : this.repo,
      send : this.send
    }
  },

  componentWillMount () {
    this.props.presenter._setRepo(this.repo)
    this.recalculate(this.props)
  },

  componentDidMount () {
    this.repo.on('change', this.updateState, this)
    this.props.presenter.refs = this.refs
  },

  componentDidUpdate () {
    this.props.presenter.refs = this.refs
  },

  componentWillUnmount () {
    const { presenter, parentProps, parentState, repo } = this.props

    presenter.teardown(this.repo, parentProps, parentState)

    if (this.repo !== (repo || this.context.repo)) {
      this.repo.teardown()
    }
  },

  componentWillReceiveProps (next) {
    this.recalculate(next)
  },

  render () {
    const { presenter, parentProps } = this.props

    const model = merge(parentProps, { send: this.send, repo: this.repo }, this.state)

    if (presenter.hasOwnProperty('view') || presenter.view.prototype.isReactComponent) {
      return createElement(presenter.view, model)
    }

    return presenter.view(model)
  },

  getRepo () {
    const { presenter, parentProps, repo } = this.props

    return presenter.getRepo(repo || this.context.repo, parentProps)
  },

  updatePropMap ({ presenter, parentProps, parentState }) {
    this.propMap = presenter.getModel(this.repo, parentProps, parentState)
    this.propMapKeys = Object.keys(this.propMap || EMPTY)
  },

  recalculate (props) {
    this.updatePropMap(props)
    this.updateState()
  },

  updateState () {
    let next = this.getState()


    if (next) {
      this.props.presenter.model = merge(this.state, next)
      this.setState(next)
    }
  },

  getState () {
    let repoState = this.repo.state

    if (typeof this.propMap === 'function') {
      return this.propMap(repoState)
    }

    let next = null

    for (var i = this.propMapKeys.length - 1; i >= 0; --i) {
      var key = this.propMapKeys[i]
      var entry = this.propMap[key]

      var value = typeof entry === 'function' ? entry(repoState) : entry

      if (this.state[key] !== value) {
        next = next || {}
        next[key] = value
      }
    }

    return next
  },

  send (intent, ...params) {
    const { presenter } = this.props

    const registry = presenter.register()

    // Tag intents so that they register the same way in the Presenter
    // and Microcosm instance
    intent = tag(intent)

    // Does the presenter register to this intent?
    if (registry && registry.hasOwnProperty(intent)) {
      return registry[intent].call(presenter, this.repo, ...params)
    }

    // No: try the parent presenter
    if (this.context.send) {
      // Do not allow transfer across repos
      if (get(this.repo, 'history') === get(this.context, ['repo', 'history'])) {
        return this.context.send.apply(null, arguments)
      }
    }

    // If we hit the top, push the intent into the Microcosm instance
    return this.repo.push(...arguments)
  }
})

PresenterContext.propTypes = {
  repo : PropTypes.object
}

PresenterContext.contextTypes = {
  repo : PropTypes.object,
  send : PropTypes.func
}

PresenterContext.childContextTypes = {
  repo : PropTypes.object,
  send : PropTypes.func
}

export default Presenter
