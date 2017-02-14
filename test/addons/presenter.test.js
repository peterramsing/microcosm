import React from 'react'
import Microcosm from '../../src/microcosm'
import Presenter from '../../src/addons/presenter'
import withAction from '../../src/addons/with-action'
import {mount} from 'enzyme'

const View = withAction(function ({ send }) {
  return <button id="button" onClick={() => send('test', true)} />
})

class Repo extends Microcosm {
  setup () {
    this.addDomain('color', {
      getInitialState () {
        return 'yellow'
      }
    })
  }
}

describe('refs', function () {

  it('should support string refs', function() {
    class MyPresenter extends Presenter {
      view () {
        return <p ref="container">Test</p>
      }
    }

    let wrapper = mount(<MyPresenter />)

    expect(wrapper.ref('container').length).toEqual(1)
  })

  it('should support dynamic refs', function() {
    var count = 0

    class MyPresenter extends Presenter {
      view () {
        return <p ref={() => this.foo = count++}>Test</p>
      }
    }

    let wrapper = mount(<MyPresenter />)

    expect(wrapper.get(0).foo).toEqual(0)

    wrapper.unmount()

    expect(wrapper.get(0).foo).toEqual(1)
  })

})

describe('::getModel', function() {

  test('model is an alias for model ', function () {
    class Hello extends Presenter {
      getModel (repo, { place }) {
        return {
          greeting: "Hello, " + place + "!"
        }
      }

      view ({ greeting }) {
        return <p>{ greeting }</p>
      }
    }

    let wrapper = mount(<Hello place="world" />)

    expect(wrapper.text()).toEqual('Hello, world!')
  })

  test('passes send within the model', function () {
    let spy = jest.fn()

    class Hello extends Presenter {
      register () {
        return {
          'test': spy
        }
      }
      view ({ send }) {
        return <button onClick={() => send('test')} />
      }
    }

    let wrapper = mount(<Hello place="world" />).simulate('click')

    expect(spy).toHaveBeenCalled()
  })

  test('references the forked repo', function () {
    expect.assertions(1)

    let repo = new Microcosm()

    class Test extends Presenter {
      view (model) {
        expect(model.repo.parent).toBe(repo)

        return <p>Test</p>
      }
    }

    mount(<Test repo={repo} />)
  })

  test('builds the view model into state', function () {
    class MyPresenter extends Presenter {
      getModel () {
        return {
          color: state => state.color
        }
      }
      view({ color }) {
        return <div>{color}</div>
      }
    }

    const repo = new Repo()
    const presenter = mount(<MyPresenter repo={repo} />)

    repo.patch({ color: 'red' })

    const text = presenter.text()

    expect(text).toEqual('red')
  })

  test('handles non-function view model bindings', function () {
    class MyPresenter extends Presenter {
      getModel (repo, { name }) {
        return {
          upper: name.toUpperCase()
        }
      }
      view({ upper }) {
        return <p>{upper}</p>
      }
    }

    var presenter = mount(<MyPresenter name="phil" repo={new Microcosm()} />)

    expect(presenter.text()).toEqual('PHIL')
  })

  test('allows functions to return from model', function () {
    class MyPresenter extends Presenter {
      getModel () {
        return state => state
      }

      view ({ color }) {
        return <p>{color}</p>
      }
    }

    const repo = new Repo()
    const el = mount(<MyPresenter repo={repo} />)

    repo.patch({ color: 'red' })

    expect(el.text()).toEqual('red')
  })

  test('does not update state if no key changes', function () {
    let spy = jest.fn(() => <p>Test</p>)

    class MyPresenter extends Presenter {
      getModel () {
        return { active: true }
      }

      view = spy
    }

    const repo = new Repo()
    const el = mount(<MyPresenter repo={repo} />)

    repo.patch({ color: 'green' })
    repo.patch({ color: 'turquoise' })

    expect(spy).toHaveBeenCalledTimes(1)
  })

  describe('when updating props', function () {

    test('recalculates the view model if the props are different', function () {
      const repo = new Microcosm()

      repo.addDomain('name', {
        getInitialState () {
          return 'Kurtz'
        }
      })

      class Namer extends Presenter {
        getModel (repo, props) {
          return {
            name: state => props.prefix + ' ' + state.name
          }
        }
        view ({ name }) {
          return (<p>{ name }</p>)
        }
      }

      const wrapper = mount(<Namer prefix="Colonel" repo={repo} />)

      wrapper.setProps({ prefix: 'Captain' })

      expect(wrapper.text()).toEqual('Captain Kurtz')
    })

    test('does not recalculate the view model if the props are the same', function () {
      const repo = new Microcosm()
      const spy = jest.fn()

      class Namer extends Presenter {
        getModel = spy
      }

      const wrapper = mount(<Namer prefix="Colonel" repo={repo} />)

      wrapper.setProps({ prefix: 'Colonel' })

      expect(spy.mock.calls.length).toEqual(1)
    })
  })

  describe('when updating state', function () {
    class Namer extends Presenter {
      state = {
        greeting: 'Hello'
      }

      getModel (repo, props, state) {
        return {
          text: state.greeting + ', ' + props.name
        }
      }

      view ({ text }) {
        return <p>{text}</p>
      }
    }

    test('calculates the model with state', function () {
      const wrapper = mount(<Namer name="Colonel" />)

      expect(wrapper.text()).toEqual('Hello, Colonel')
    })

    test('recalculates the model when state changes', function () {
      const wrapper = mount(<Namer name="Colonel" />)

      wrapper.setState({
        "greeting": "Salutations"
      })

      expect(wrapper.text()).toEqual('Salutations, Colonel')
    })

    test('does not recalculate the model when state is the same', function () {
      const spy = jest.fn(function() {
        return <p>Test</p>
      })

      class TrackedNamer extends Namer {
        view = spy
      }

      const wrapper = mount(<TrackedNamer name="Colonel" />)

      wrapper.setState({
        "greeting": 'Hello'
      })

      expect(spy).toHaveBeenCalledTimes(1)
    })

  })

})

describe('::setup', function() {

  test('runs a setup function when created', function () {
    const test = jest.fn()

    class MyPresenter extends Presenter {
      get setup () {
        return test
      }
    }

    mount(<MyPresenter repo={ new Microcosm() } />)

    expect(test).toHaveBeenCalled()
  })

  test('domains added in setup show up in the view model', function () {
    class MyPresenter extends Presenter {
      setup (repo) {
        repo.addDomain('prop', {
          getInitialState() {
            return 'test'
          }
        })
      }

      getModel () {
        return {
          prop: state => state.prop
        }
      }

      view ({ prop }) {
        return <p>{prop}</p>
      }
    }

    let prop = mount(<MyPresenter repo={ new Microcosm() } />).text()

    expect(prop).toEqual('test')
  })

  test('calling setState in setup does not raise a warning', function () {
    class MyPresenter extends Presenter {
      setup() {
        this.setState({ foo: 'bar' })
      }
    }

    mount(<MyPresenter repo={ new Microcosm() } />)
  })

  test('setup is called before the initial model', function () {
    const spy = jest.fn()

    class Test extends Presenter {
      setup () {
        spy('setup')
      }

      getModel () {
        spy('model')
        return {}
      }
    }

    mount(<Test />)

    let sequence = spy.mock.calls.map(args => args[0])

    expect(sequence).toEqual(['setup', 'model'])
  })

})

describe('::update', function() {

  test('runs an update function when it gets new props', function () {
    const test = jest.fn()

    class MyPresenter extends Presenter {
      update (repo, props) {
        test(props.test)
      }
    }

    let wrapper = mount(<MyPresenter repo={ new Microcosm() } test="foo" />)

    wrapper.setProps({ test: "bar" })

    expect(test).toHaveBeenCalledWith('bar')
  })

  test('does not run an update function when no props change', function () {
    class MyPresenter extends Presenter {
      update(repo, props) {
        throw new Error('Presenter update method should not have been called')
      }
    }

    let wrapper = mount(<MyPresenter repo={ new Microcosm() } test="foo" />)

    wrapper.setProps({ test: "foo" })
  })

  test('it has access to the old props when update is called', function () {
    const callback = jest.fn()

    class Test extends Presenter {
      update (repo, { color }) {
        callback(this.props.color, color)
      }
    }

    mount(<Test color="red"><p>Hey</p></Test>).setProps({ color: 'blue' })

    expect(callback).toHaveBeenCalledWith('red', 'blue')
  })

})

describe('::teardown', function() {

  test('teardown gets the last props', function () {
    const spy = jest.fn()

    class Test extends Presenter {
      get teardown () {
        return spy
      }
    }

    const wrapper = mount(<Test test="foo" />)

    wrapper.setProps({ test: 'bar' })

    wrapper.unmount()

    expect(spy.mock.calls[0][1].test).toEqual('bar')
  })

  test('eliminates the teardown subscription when overriding getRepo', function () {
    const spy = jest.fn()

    class Test extends Presenter {
      teardown = spy

      getRepo (repo) {
        return repo
      }
    }

    const repo = new Microcosm()
    const wrapper = mount(<Test repo={repo}/>)

    wrapper.unmount()
    repo.teardown()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('does not teardown a repo that is not a fork', function () {
    const spy = jest.fn()

    class Test extends Presenter {
      getRepo (repo) {
        return repo
      }
    }

    const repo = new Microcosm()

    repo.on('teardown', spy)

    mount(<Test repo={repo}/>).unmount()

    expect(spy).toHaveBeenCalledTimes(0)
  })
})

describe('::view', function() {

  test('views can be stateful react components', function () {
    class MyView extends React.Component {
      render() {
        return <p>{this.props.message}</p>
      }
    }

    class MyPresenter extends Presenter {
      view = MyView

      getModel() {
        return { message: 'hello' }
      }
    }

    let text = mount(<MyPresenter />).text()

    expect(text).toEqual('hello')
  })

  test('views can be stateless components', function () {
    function MyView ({ message }) {
      return (<p>{message}</p>)
    }

    class MyPresenter extends Presenter {
      view = MyView

      getModel() {
        return { message: 'hello' }
      }
    }

    let text = mount(<MyPresenter />).text()

    expect(text).toEqual('hello')
  })

  test('views can be functions', function () {
    class MyPresenter extends Presenter {
      view ({ message }) {
        return <p>{message}</p>
      }
      getModel() {
        return { message: 'hello' }
      }
    }

    let text = mount(<MyPresenter />).text()

    expect(text).toEqual('hello')
  })

  test('view functions preserve scope', function () {
    expect.assertions(1)

    class MyPresenter extends Presenter {
      view () {
        expect(this instanceof MyPresenter).toBe(true)
        return <p>Test</p>
      }
    }

    mount(<MyPresenter />)
  })

  test('views can be getters', function () {
    class MyView extends React.Component {
      render() {
        return <p>{this.props.message}</p>
      }
    }

    class MyPresenter extends Presenter {
      get view () {
        return MyView
      }
      getModel() {
        return { message: 'hello' }
      }
    }

    let text = mount(<MyPresenter />).text()

    expect(text).toEqual('hello')
  })
})

describe('purity', function() {

  test('does not cause a re-render when shallowly equal', function () {
    const repo = new Microcosm()
    const renders = jest.fn(() => <p>Test</p>)

    repo.patch({ name: 'Kurtz' })

    class Namer extends Presenter {
      getModel() {
        return { name: state => state.name }
      }

      get view () {
        return renders
      }
    }

    mount(<Namer repo={ repo } />)

    repo.patch({ name: 'Kurtz', unrelated: true })

    expect(renders.mock.calls.length).toEqual(1)
  })

})

describe('unmounting', function () {

  test('ignores an repo when it unmounts', function () {
    const spy = jest.fn()

    class Test extends Presenter {
      setup (repo) {
        repo.teardown = spy
      }
    }

    mount(<Test />).unmount()

    expect(spy).toHaveBeenCalled()
  })

  test('does not update the view model when umounted', function () {
    const spy = jest.fn(n => {})

    class MyPresenter extends Presenter {
      // This should only run once
      get getModel() {
        return spy
      }
    }

    let repo = new Microcosm()
    let wrapper = mount(<MyPresenter repo={repo} />)

    wrapper.unmount()

    repo.patch({ foo: 'bar' })

    expect(spy.mock.calls.length).toEqual(1)
  })

})

describe('rendering efficiency', function() {

  test('child view model is not recalculated when parents cause them to re-render', function () {
    const repo = new Repo()

    const model = jest.fn(function() {
      return { color: state => state.color }
    })

    class Child extends Presenter {
      getModel = model

      render () {
        return <p>{ this.model.color }</p>
      }
    }

    class Parent extends Presenter {
      view = Child
    }

    let wrapper = mount(<Parent repo={repo} />)

    repo.patch({ color: 'green' })

    expect(model).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toEqual('green')
  })

  test('should re-render when state changes', function () {
    const spy = jest.fn(() => null)

    class Test extends Presenter {
      view = spy
    }

    mount(<Test />).setState({ test: true })

    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('::render', function () {

  test('the default render implementation passes children', function () {
    let wrapper = mount(<Presenter><p>Test</p></Presenter>)

    expect(wrapper.text()).toEqual('Test')
  })

  test('handles overridden an overriden render method', function () {
    class Test extends Presenter {
      render() {
        return <p>Test</p>
      }
    }

    expect(mount(<Test />).text()).toEqual('Test')
  })

  test('scope of render should be the presenter', function () {
    expect.assertions(1)

    class Test extends Presenter {
      render () {
        expect(this).toBeInstanceOf(Test)

        return <p>Test</p>
      }
    }

    mount(<Test />)
  })

  test('overridden render passes context', function () {
    expect.assertions(1)

    function Child (props, context) {
      expect(context.repo).toBeDefined()

      return <p>Test</p>
    }

    Child.contextTypes = {
      repo: React.PropTypes.any
    }

    class Test extends Presenter {
      render() {
        return <Child />
      }
    }

    mount(<Test />)
  })

})

describe('::getRepo', function () {

  it('can circumvent forking behavior', function () {
    class NoFork extends Presenter {
      getRepo (repo) {
        return repo
      }
    }

    let repo = new Microcosm()
    let wrapper = mount(<NoFork repo={repo} />)

    expect(wrapper.instance().repo).toEqual(repo)
  })

})

describe('intents', function() {

  test('receives intent events', function () {
    const test = jest.fn()

    class MyPresenter extends Presenter {
      register() {
        return { test }
      }

      view() {
        return <View />
      }
    }

    mount(<MyPresenter repo={new Microcosm()} />).find(View).simulate('click')

    expect(test.mock.calls[0][1]).toEqual(true)
  })

  test('intents do not bubble to different repo types', function () {
    const test = jest.fn()

    class Child extends Presenter {
      view = View
    }

    class Parent extends Presenter {
      render () {
        return <div>{this.props.children}</div>
      }
    }

    let top = new Microcosm({ maxHistory: Infinity })
    let bottom = new Microcosm({ maxHistory: Infinity })

    let wrapper = mount(<Parent repo={top}><Child repo={bottom} /></Parent>)

    wrapper.find(View).simulate('click')

    expect(top.history.size).toBe(0)
    expect(bottom.history.size).toBe(1)
  })

  test('intents do not bubble to different repo types even if not forking', function () {
    const test = jest.fn()

    class Child extends Presenter {
      view = View
    }

    class Parent extends Presenter {
      getRepo (repo) {
        return repo
      }
      render () {
        return <div>{this.props.children}</div>
      }
    }

    let top = new Microcosm({ maxHistory: Infinity })
    let bottom = new Microcosm({ maxHistory: Infinity })

    let wrapper = mount(<Parent repo={top}><Child repo={bottom} /></Parent>)

    wrapper.find(View).simulate('click')

    expect(top.history.size).toBe(0)
    expect(bottom.history.size).toBe(1)
  })

  test('forwards intents to the repo as actions', function () {
    class MyPresenter extends Presenter {
      view() {
        return <View />
      }
    }

    const repo = new Microcosm({ maxHistory: 1 })

    mount(<MyPresenter repo={repo} />).find(View).simulate('click')

    expect(repo.history.head.behavior.toString()).toEqual('test')
  })

  test('send bubbles up to parent presenters', function () {
    const test = jest.fn()

    class Child extends Presenter {
      view() {
        return <View />
      }
    }

    class Parent extends Presenter {
      register() {
        return { test: (repo, props) => test(props) }
      }
      view () {
        return <Child />
      }
    }

    mount(<Parent repo={ new Microcosm() } />).find(View).simulate('click')

    expect(test).toHaveBeenCalledWith(true)
  })

  test('intents are tagged', function () {
    const spy = jest.fn()

    const a = function a () {}
    const b = function a () {}

    const TestView = React.createClass({
      contextTypes: {
        send: React.PropTypes.func.isRequired
      },
      render() {
        return <button id="button" onClick={() => this.context.send(b, true)} />
      }
    })

    class Test extends Presenter {
      register() {
        return { [a]: spy }
      }
      view() {
        return <TestView />
      }
    }

    mount(<Test />).find(TestView).simulate('click')

    expect(spy).not.toHaveBeenCalled()
  })

  test('send is available in setup', function () {
    const test = jest.fn()

    class Parent extends Presenter {
      setup() {
        this.send('test')
      }
      register() {
        return { test }
      }
    }

    mount(<Parent />)

    expect(test).toHaveBeenCalled()
  })

  test('send can be called directly from the Presenter', function () {
    const test = jest.fn()

    class Parent extends Presenter {
      register() {
        return { test }
      }
    }

    mount(<Parent />).instance().send('test', true)

    expect(test).toHaveBeenCalled()
  })

})

describe('forks', function () {

  test('nested presenters fork in the correct order', function () {
    class Top extends Presenter {
      setup(repo) {
        repo.name = 'top'
      }
    }

    class Middle extends Presenter {
      setup(repo) {
        repo.name = 'middle'
      }
    }

    class Bottom extends Presenter {
      setup(repo) {
        repo.name = 'bottom'
      }

      view () {
        let names = []
        let repo = this.repo

        while (repo) {
          names.push(repo.name)
          repo = repo.parent
        }

        return <p>{names.join(', ')}</p>
      }
    }

    const text = mount(<Top><Middle><Bottom /></Middle></Top>).text()

    expect(text).toEqual('bottom, middle, top')
  })

})
