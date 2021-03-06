# Effects

1. [Overview](#overview)
2. [A quick example](#a-quick-example---query-strings)
3. [API](#api)

## Overview

Not all actions result in updates to application state. For example:

* Writing backup data to `localStorage`
* Sending analytics events
* Persisting query information in the URL.

**Effect handlers fire immediately Domains and are only called once per
action state.** This means that a repo's state is up to date with
the latest state transitions by the time they execute.

## A quick example - query strings

URL persistence is important for shareability and wayfinding. However,
a full routing solution isn't always practical. On some projects we
simply want to push search parameters or other meta data into a query
string.

This is a perfect use case for an effect:

```javascript
// /src/effects/location.js

import url from 'url'
import {patchQuery} from '../actions/query'

class Location {

  updateQuery (repo) {
    const { origin, hash } = window.location

    const location = url.format({
      host  : origin,
      query : repo.state.query,
      hash  : hash
    })

    window.history.pushState(null, null, location)
  }

  register () {
    return {
      [patchQuery] : this.updateQuery
    }
  }
}

export default Location
```

## API

### `setup(repo, options)`

Setup runs right after an effect is added to a Microcosm. It receives
that repo and any options passed as the second argument.

### `teardown(repo)`

Runs whenever `Microcosm::teardown` is invoked. Useful for cleaning up
work done in `setup()`.

### `register()`

Returns an object mapping actions to methods on the effect. This is the
communication point between a effect and the rest of the system.

```javascript
// /src/effects/planets.js

import { addPlanet } from '../actions/planets'

class Planets {
  //...
  register () {
    return {
      [addPlanet]: this.alert
    }
  }

  alert (repo, planet) {
    alert('A planet was added! ' + planet.name)
  }
}

repo.addEffect(Planets)
repo.push(addPlanet, { name: 'earth' }) // this will add Earth
```
