import Connect   from '../../src/addons/connect'
import DOM       from 'react-dom'
import Microcosm from '../../src/microcosm'
import Provider  from '../../src/addons/provider'
import React     from 'react'
import Test      from 'react-addons-test-utils'
import assert    from 'assert'

function assertText(component, text) {
  assert.equal(DOM.findDOMNode(component).textContent, text)
}

describe('Connect Add-on', function() {

  it ('given context, it injects an application instance into a component as a prop', function(done) {
    let app = new Microcosm()

    let Namer = Connect()(React.createClass({
      componentDidMount() {
        assert.equal(this.props.app, app)
        done()
      },
      render() {
        return (<p>Test</p>)
      }
    }))

    Test.renderIntoDocument(<Provider app={ app }><Namer /></Provider>)
  })

  it ('listens to an application when it mounts', function (done) {
    let app = new Microcosm()

    app.on = () => done()

    let Component = Connect()(props => <p>MVP</p>)
    let component = Test.renderIntoDocument(<Component app={ app } />)
  })

  it ('ignores an application when it unmounts', function(done) {
    let app = new Microcosm()

    app.off = () => done()

    let Child  = Connect()(props => <p>MVP</p>)
    let Parent = React.createClass({
      getInitialState() {
        return { display: true }
      },
      render() {
        return this.state.display ? <Child app={ app } /> : null
      }
    })

    let component = Test.renderIntoDocument(<Parent />)
    component.setState({ display: false })
  })

  it ('maps application state to props', function () {
    let app = new Microcosm()

    app.replace({ name: 'Kurtz' })

    let Namer = Connect(function(props) {
      return { name: state => props.prefix + ' ' + state.name }
    })(function({ name }) {
      return (<p>{ name }</p>)
    })

    let component = Test.renderIntoDocument(<Namer app={ app } prefix="Colonel" />)

    assertText(component, 'Colonel Kurtz')
  })

  it ('sends new props to the component when an application changes', function () {
    let app = new Microcosm()

    app.replace({ name: 'Kurtz' })

    let Namer = Connect(function(props) {
      return { name: state => props.prefix + ' ' + state.name }
    })(function({ name }) {
      return (<p>{ name }</p>)
    })

    let parent = Test.renderIntoDocument(<Namer app={ app } prefix="Colonel" />)

    assertText(parent, 'Colonel Kurtz')
    app.replace({ name: 'Hawk' })
    assertText(parent, 'Colonel Hawk')
  })

  context('when the connection is pure (default option)', function() {

    it ('does not cause a re-render if mapped state values do not change', function () {
      let app = new Microcosm()
      let renders = 0

      app.replace({ name: 'Kurtz' })

      let Namer = Connect(function() {
        return { name: state => state.name }
      })(function({ name }) {
        renders += 1
        return (<p>{ name }</p>)
      })

      Test.renderIntoDocument(<Namer app={ app } />)

      app.replace({ name: 'Kurtz', unrelated: true })

      assert.equal(renders, 1)
    })

    it ('does not cause a re-render if state is the same', function () {
      let app = new Microcosm()
      let renders = 0

      app.replace({ name: 'Kurtz' })

      let Namer = Connect(function() {
        return { name: state => state.name }
      })(function({ name }) {
        renders += 1
        return (<p>{ name }</p>)
      })

      Test.renderIntoDocument(<Namer app={ app } />)

      app.replace({ name: 'Kurtz' })

      assert.equal(renders, 1)
    })

  })

  context('when the connection is impure', function() {

    it ('always re-renders when the app changes', function () {
      let app = new Microcosm()
      let renders = 0

      app.replace({ name: 'Kurtz' })

      let Namer = Connect(function() {
        return { name: state => state.name }
      }, { pure : false })(function({ name }) {
        renders += 1
        return (<p>{ name }</p>)
      })

      Test.renderIntoDocument(<Namer app={ app } />)

      app.replace({ name: 'Kurtz', unrelated: true })

      assert.equal(renders, 2)
    })

  })

  context('when the connection receives new props', function() {

    it ('recalculates mappings if the props are different', function () {
      let app = new Microcosm()
      let renders = 0

      app.replace({ name: 'Kurtz' })

      let Namer = Connect(function(props) {
        return { name: state => props.prefix + ' ' + state.name }
      })(function({ name }) {
        return (<p>{ name }</p>)
      })

      let Wrapper = React.createClass({
        getInitialState() {
          return { prefix: this.props.prefix }
        },
        render() {
          return <Namer app={ app } prefix={ this.state.prefix } />
        }
      })

      let parent = Test.renderIntoDocument(<Wrapper prefix="Colonel" />)

      assertText(parent, 'Colonel Kurtz')
      parent.setState({ prefix: 'Captain' })
      assertText(parent, 'Captain Kurtz')
    })

    it ('does not recalculate mappings if the props are the same', function () {
      let app = new Microcosm()
      let remappings = 0

      app.replace({ name: 'Kurtz' })

      let Namer = Connect(function(props) {
        remappings += 1
        return { name: state => props.prefix + ' ' + state.name }
      })(function({ name }) {
        return (<p>{ name }</p>)
      })

      let Wrapper = React.createClass({
        getInitialState() {
          return { prefix: this.props.prefix }
        },
        render() {
          return <Namer app={ app } prefix={ this.state.prefix } />
        }
      })

      let parent = Test.renderIntoDocument(<Wrapper prefix="Colonel" />)

      parent.setState({ prefix: 'Colonel' })
      assert.equal(remappings, 1)
    })

    it ('always recalculates mappings when impure', function () {
      let app = new Microcosm()
      let remappings = 0

      app.replace({ name: 'Kurtz' })

      let Namer = Connect(function(props) {
        remappings += 1
        return { name: state => props.prefix + ' ' + state.name }
      }, { pure: false })(function({ name }) {
        return (<p>{ name }</p>)
      })

      let Wrapper = React.createClass({
        getInitialState() {
          return { prefix: this.props.prefix }
        },
        render() {
          return <Namer app={ app } prefix={ this.state.prefix } />
        }
      })

      let parent = Test.renderIntoDocument(<Wrapper prefix="Colonel" />)

      parent.setState({ prefix: 'Colonel' })
      assert.equal(remappings, 2)
    })

  })

  describe('valueOf option', function () {

    beforeEach(function () {
      this.app = new Microcosm()
    })

    it ('calls valueOf on getters when configured', function () {
      this.app.replace({ name: 'Kurtz' })

      let Namer = Connect(props => ({
        name: state => ({ valueOf: () => state.name.toLowerCase() })
      }), { valueOf: true })(({ name }) => (<p>{ name }</p>))

      let namer = Test.renderIntoDocument(<Namer app={ this.app } />)

      assert.equal(namer.state.name, 'kurtz')
    })

    it ('handles valueOf null', function () {
      this.app

      let Namer = Connect(props => ({
        name: state => null
      }), { valueOf: true })(({ name }) => (<p>{ name }</p>))

      let namer = Test.renderIntoDocument(<Namer app={ this.app } />)

      assert.equal(namer.state.name, null)
    })

    it ('handles valueOf undefined', function () {
      this.app

      let Namer = Connect(props => ({
        name: state => undefined
      }), { valueOf: true })(({ name }) => (<p>{ name }</p>))

      let namer = Test.renderIntoDocument(<Namer app={ this.app } />)

      assert.equal(namer.state.name, undefined)
    })
  })

  describe('Nested connect instances', function() {
    beforeEach(function () {
      this.app = new Microcosm()
    })

    it ('does not waste rendering on nested children', function() {
      var renders = 0

      let Child = Connect(function (props) {
        return { name: state => state.name }
      })(function Child (props) {
        renders += 1
        return <p>{ props.name }</p>
      })

      let Parent = Connect(function (props) {
        return { name: state => state.name }
      })(function Parent (props) {
        renders += 1
        return <Child app={ props.app } />
      })

      let namer = Test.renderIntoDocument(<Parent app={ this.app } />)

      this.app.replace({ name: 'Billy Booster' }, function() {
        assert.equal(renders, 4)
      })
    })
  })
})
