"use strict";

(function() {

// Empty constructor to make objects with a custom prototype
function EmptyObject() {};

// Factory to make empty objects using the provided prototype
function makeChildOf(prototype) {
  if (!prototype)
    throw new TypeError("missing prototye");
    
  EmptyObject.prototype = prototype;
  
  return new EmptyObject;
}

// Add all the properties inside of the API definition def to the provided set
// possibly with recursion in the embedded APIs
function addHooks(def, set, noRecurse) {
  var props = noRecurse ? def : def.properties;
  
  if (props) {
    for (var p in props) {
      if (! props.hasOwnProperty(p))
        continue

      // skip this property if it has already been added
      if (set[p] === undefined) {
        set[p] = true;
      }
    }
  }
  
  if (!noRecurse) {
    for (var n in def.APIs) {
      if (! def.APIs.hasOwnProperty(n))
        continue

      addHooks(def.APIs[n], set);
    }
  }
}

function buildHookSet(def) {
  var set = {};
  
  addHooks(def, set);
  addHooks(def.staticProperties, set, true);
  
  return set;
}

function makePrototype(hookSet, getter, setter) {
  var proto = {};
  
  if (!getter)
    throw new TypeError("missing getter callback");
  
  if (!setter)
    throw new TypeError("missing setter callback");
  
  for (var p in hookSet) {
    if (! hookSet.hasOwnProperty(p))
      continue

    (function() {
      var q = p;
      
      Object.defineProperty(proto, q, {
        get: function() {
          // if we don't bind, the getter is bound to the global object
          return getter.call(this, q);
          
        },
        set: function(value) {
          setter.call(this, q, value);
          
        },
        configurable: false,
        enumerable: true,
      });
      
    })();
  }
  
  return proto;
}

/*
 *  Factory to build a new state object for a single link of the chain
 *  
 *  parentState: the state object of the parent link
 *  libState: the state object of the library
 */
function makeLinkState(parentState, ctor, libState, prop) {
  var linkState;
  
  if (!parentState && libState) {
    linkState = makeChildOf({
      treeState: {},
      libState: libState
    });
    
  } else if (parentState) {
    linkState = makeChildOf(Object.getPrototypeOf(parentState));
    linkState.parentState = parentState;
    
  } else 
    throw new TypeError("bad arguments: " + parentState + "; " + libState);
  
  if (ctor) {
    // Put the property name that we're getting so the library doesn't need
    // to figure it out.
    if (prop)
      linkState.propertyName = prop;

    ctor.apply(linkState)
  }
    
  return linkState;
}
/*
 *  Find the API within the library definition def, using the state of
 *  the link and the arguments passed to current link of the chain
 */
function resolveAPI(state, def, prop, args) {
  if (def.test) 
    var subAPI = def.test.apply(state, [prop, args]);
  else
    return def;
  
  if (!subAPI)
    console.log("the test function must return a non-empty string");
  
  if (typeof def.APIs[subAPI].test === "function") {
    def = def.APIs[subAPI];
    return resolveAPI(state, def, prop, args);
  }
  
  if (!def.APIs[subAPI])
    throw new TypeError("this API (" + subAPI + ") doesn't exist");
  
  return def.APIs[subAPI];
}

var ACCESSOR_TOKEN = ["ACCESSOR_TOKEN"];
var FIRST_LINK_FLAG = "FIRST_LINK_FLAG";

function getterHook(prop) {
  var states = this(ACCESSOR_TOKEN);
  
  if (typeof states !== "object") {
    console.log(states, this);
    throw new TypeError("failed to get states");
  }
  
  var flag = states[0],
    s1 = states[1],
    s2 = states[2],
    parentState, parentHiddenState,
    // state may be either of the libState if we're getting
    // a static property or the state of the new link
    state, hiddenState,
    isStatic,
    property;
    
  if (flag === FIRST_LINK_FLAG && s1 && s2) {
  
    if (s2.staticProperties && s2.staticProperties[prop]) {
      state = s1;
      hiddenState = s2;
      property = s2.staticProperties[prop];
      isStatic = true;
      
    } else if (s2.def.properties && s2.def.properties[prop]) {
      property = s2.def.properties[prop];
      
      state = makeLinkState(null, s2.linkCtor, s1, prop);
      hiddenState = makeLinkState(null, null, s2);
      
    } else
      throw new Error(prop + " is neither a static property, nor a common one");
      
  } else if (s1 && s2) {
  
    parentState = s1;
    parentHiddenState = s2;
    var api = resolveAPI(parentState, parentHiddenState.libState.def, prop);
    
    if (api.properties && api.properties[prop])
      // get the property of name "prop" from the resolved API
      property = api.properties[prop]
    
    state = makeLinkState(parentState, parentHiddenState.libState.linkCtor,
      undefined, prop);
    hiddenState = makeLinkState(parentHiddenState);

  } else
    console.log("missing a state:", states);
    
  state.api = makeAPI(state, hiddenState);
  
  if (typeof property.get === "function" 
    && typeof property.invoke === "function") {
    
    var rawReturn = property.get.apply(state);
    
    if (rawReturn && rawReturn[0] === true)
      return rawReturn[1];
      
    hiddenState.invoke = property.invoke;
    hiddenState.fork = true;
    
  } else if (typeof property.get === "function") {
  
    var rawReturn = property.get.apply(state);
    if (rawReturn && rawReturn[0] === true)
      return rawReturn[1];
      
    hiddenState.noInvoke = prop;
    
  } else if (typeof property.invoke === "function")
    hiddenState.invoke = property.invoke;
    
  if (isStatic)
    return this;
    
  return state.api;
}
function setterHook(prop, value) {
  // TODO
  throw new Error("todo");
}
function makeAPI(linkState, linkHiddenState) {
  function ret(arg0) {
    // This allows the getter and the setter to access the states
    // by calling "this(ACCESSOR_TOKEN)"
    if (arg0 === ACCESSOR_TOKEN) {
      return [null, linkState, linkHiddenState];
    }
    
    // Give the library a back door to get the state from this API
    if (linkHiddenState.libState && linkHiddenState.libState.STATE_ACCESSOR_TOKEN
      && arg0 === linkHiddenState.libState.STATE_ACCESSOR_TOKEN)
      return linkState;
    
    var parentState = linkState,
      parentHiddenState = linkHiddenState,
      invokeFunction,
      api,
      newState,
      newHiddenState;
    // necessary ???
    // yes, because otherwise, the test is run twice and
    // the second time, the test runs, it is likely that
    // we end up making a direct invokation instead of
    // calling a method
    // ex: $("").doMagic() would run $("")() while getting doMagic as well
    if (typeof parentHiddenState.invoke === "function") {
      //console.log("invoke shortcut");
      invokeFunction = parentHiddenState.invoke;
    } else if (parentHiddenState.noInvoke) {
      console.log("this property cannot be called", parentHiddenState);
      throw new TypeError("Runtime error");
    } else {
      api = resolveAPI(parentState, parentHiddenState.libState.def, null, arguments);
      if (typeof api.invoke === "function") {
        invokeFunction = api.invoke;
      } else {
        console.log(api);
        throw new TypeError("no invoke function found in this API");
      }
    }
    
    if (typeof parentHiddenState.invoke === "function"
      && parentHiddenState.fork !== true)
      // FIXME: the rule should be: if a property call be called, create a new
      // state for each call, regardless of whether the property can be gotten.
      // The current state of the code actually prevents forking such as the
      // one in the example below in the case where a property can only be
      // invoke. Javascript still allows it to be gotten and called several
      // times. By reusing the state created in the getter, all calls have to
      // share it.
      //
      // If we are invoking a method, a new state has just been made in
      // the getter hook
      // Should a property that has both an invoke and a get be passed
      // a new state here?
      // Yes, so the chain can be forked like so:
      // var myFork = myLib.method;
      // myFork(123);
      // myFork(321);
      // Without creating a new state, the two calls to myFork would have
      // to share the same state, the one created when getting myLib.method
      newState = parentState;
    else
      newState = makeLinkState(parentState, parentHiddenState.libState.linkCtor);
      
    newHiddenState = makeLinkState(parentHiddenState);
    newState.api = makeAPI(newState, newHiddenState);
      
    var rawReturn = invokeFunction.apply(newState, arguments);
    if (rawReturn && rawReturn[0] === true) {
      // if the library wants to return a result, 
      // instead of adding a link to the chain, then do so
      return rawReturn[1];
    }
    return newState.api;
  }
  ret.__proto__ = linkHiddenState.libState.proto;
  return ret;
}
function makeLib(def) {
  // TODO: check syntax errors in the def:
  // - top-level properties cannot be set, because the result cannot be gotten.
  //   Static properties can.
  // - check there are "test" functions, APIs, properties... at the right
  //   level
  var hookSet = buildHookSet(def), // list all the possible properties
    proto = makePrototype(hookSet, getterHook, setterHook),
    libState = {},
    libHiddenState = {def:def, proto:proto};
  
  if (def.STATE_ACCESSOR_TOKEN)
    libHiddenState.STATE_ACCESSOR_TOKEN = def.STATE_ACCESSOR_TOKEN;
    
  if (typeof def.libCtor === "function")
    // allows the library to have instances
    def.libCtor.apply(libState);
  
  if (typeof def.linkCtor === "function")
    // allows each link to initialize its state
    libHiddenState.linkCtor = def.linkCtor;
  
  function ret() {
    if (arguments[0] === ACCESSOR_TOKEN) {
      if (libHiddenState.invoke) {
        delete libHiddenState.invoke;
      } else if (libHiddenState.noInvoke) {
        delete libHiddenState.noInvoke;
      }
      return [FIRST_LINK_FLAG, libState, libHiddenState];
    }
    var linkState = makeLinkState(null, libHiddenState.linkCtor, libState);
    var linkHiddenState = makeLinkState(null, null, libHiddenState);
    
    linkState.api = makeAPI(linkState, linkHiddenState);
    
    if (typeof def.invoke === "function") {
      var rawReturn = def.invoke.apply(linkState, arguments);
      if (rawReturn && rawReturn[0] === true) {
        return rawReturn[1];
      }
    } else {
      console.log(api);
      throw new TypeError("no invoke function found in this API");
    }
    return linkState.api;
  };
  ret.__proto__ = proto;
  return ret;
}

exports.makeLib = makeLib;

})();
