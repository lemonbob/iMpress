/**
 * iMpress high speed framework for HTML Custom Elements
 * Copyright (c) 2019, Polymathic Design, M J Livesey, All rights reserved.
 *
 * @format
 */

const IMPRESS = {};
export default IMPRESS;

//Definition module

//PUBLIC
//INTERFACE

/**
 * Create an impress object
 * @param {String} name
 * @returns
 */
IMPRESS.create = (impressDefinitionObject) => {
	if (impressDefinitionObject.name == undefined) throw new Error(`iMpress error ---  components must have a name property`);
	impressDefinitionObject.name = impressDefinitionObject.name.toLowerCase();

	if (impressObjects.get(impressDefinitionObject.name) == undefined) {
		impressObjects.set(impressDefinitionObject.name, new IMPRESSOBJECT(impressDefinitionObject));
		//Callbacks to define HTML custom Element
		customElements.define(
			impressDefinitionObject.name,
			class extends HTMLElement {
				constructor() {
					super();
					//this.classList.add('i-style');
					//_impress.addComponent(this);
				}
				//Callback when components gets added to the DOM - "connected"
				connectedCallback() {
					_impress.connectComponent(this);
				}
				disconnectedCallback() {
					_impress.disconnectComponent(this);
				}
			}
		);
		return impressObjects.get(impressDefinitionObject.name);
	} else {
		throw new Error(`iMpress error ---  "${impressDefinitionObject.name}" impressComponent is already defined! Check modules for naming conflict`);
	}
};

IMPRESS.deepClone = (source, optionsObject = {}) => {
	if (source == undefined || typeof source !== 'object') {
		return source;
	}
	return _impress.deepClone(source, optionsObject);
};

IMPRESS.getComponentByNode = (targetNode) => {
	if (targetNode != undefined) {
		let iGuid = targetNode.getAttribute('i-guid');
		return impressComponents.get(iGuid);
	}
};

IMPRESS.getComponentById = (iGuid) => {
	return impressComponents.get(iGuid);
};

IMPRESS.getComponentsByName = (name) => {
	let componentArray = [];
	impressComponents.forEach((component, iGuid) => {
		if (component._impressInternal.name === name) componentArray.push(component);
	});
	return componentArray;
};

IMPRESS.destroyComponent = (component) => {
	component._impressInternal.iNode.parentNode.removeChild(component._impressInternal.iNode);
};

IMPRESS.queryComponent = (component, queryString) => {
	//TODO
};

IMPRESS.queryAllComponent = (component, queryString) => {
	//TODO
};

IMPRESS.closestComponent = (component, queryString) => {
	//TODO
};

/**
 * Universal wait promise waits time(ms) before resolving
 * @param {Number} time
 * @returns
 */
IMPRESS.wait = (time) => {
	return new Promise((resolve) => setTimeout(() => resolve(), time));
};

//PRIVATE/////////////////////////////////////////////////////////////////////
//Impress implementation methods
const _impress = {};
let _iGuid = 1000;

//CONSTRUCTOR METHODS
/*_impress.addComponent = (thisNode) => {
	let currentComponent = new IMPRESSCOMPONENT(thisNode);

	if (currentComponent._impressInternal.iParent != undefined) {
		currentComponent._impressInternal.iParent.iChildren.push(currentComponent);
		if (currentComponent._impressInternal.iParent._impressInternal.isMounted === true) _impress.createComponent(currentComponent);
	} else {
		_impress.createComponent(currentComponent);
	}
};*/

_impress.connectComponent = (thisNode) => {
	if (thisNode.isConnected === false) return;
	let iGuid = thisNode.getAttribute('i-guid');
	let currentComponent = impressComponents.get(iGuid);

	//create component on first connection only
	if (currentComponent == undefined) {
		let currentComponent = new IMPRESSCOMPONENT(thisNode);

		if (currentComponent._impressInternal.iParent != undefined) {
			currentComponent._impressInternal.iParent._impressInternal.iChildren.push(currentComponent);
			if (currentComponent._impressInternal.iParent._impressInternal.isMounted === true) _impress.createComponent(currentComponent);
		} else {
			_impress.createComponent(currentComponent);
		}
	}
};

/**
 * @private
 * @description
 * mounts the component
 * @param {Object} currentComponent
 *
 */
_impress.createComponent = async (currentComponent) => {
	let iObject = impressObjects.get(currentComponent._impressInternal.name);

	if (typeof currentComponent.beforeCreate === 'function') await currentComponent.beforeCreate(currentComponent);
	//let iGuidTemplate = iObject.template.replace(/i-attribute="/g, `i-attribute="${currentComponent.iGuid}-`);

	currentComponent._impressInternal.iNode.appendChild(iObject.templateNode.content.cloneNode(true));

	_impress.setiPropsMaps(currentComponent);
	_impress.setiReactiveMaps(currentComponent);
	_impress.setiEventMaps(currentComponent);

	//component has mounted
	currentComponent._impressInternal.isMounted = true;
	if (typeof currentComponent.afterMounted === 'function') await currentComponent.afterMounted(currentComponent);

	for (let n = 0; n < currentComponent._impressInternal.iChildren.length; n++) {
		_impress.createComponent(currentComponent._impressInternal.iChildren[n]);
	}
};

/**
 * finds a parent component by Node search
 * @param {Object} thisNode
 * @returns
 */
_impress.findParentComponentByNode = function (thisNode) {
	let parentNode = thisNode.parentNode;
	let parentName = parentNode.localName;

	while (parentNode.localName !== 'body' && impressObjects.get(parentName) === undefined) {
		parentNode = parentNode.parentNode;
		parentName = parentNode.localName;
	}

	if (parentName !== 'body') {
		return IMPRESS.getComponentByNode(parentNode);
	} else {
		return undefined;
	}
};

////////////////////////////////////////////////////////////////////////////////
//DESTRUCTOR METHODS

_impress.disconnectComponent = async (thisNode) => {
	//appended nodes are still connected - do not destroy them
	let name = thisNode.localName;
	let iGuid = thisNode.getAttribute('i-guid');
	let currentComponent = impressComponents.get(iGuid);

	//if component node is still connected it has been appended
	if (currentComponent == undefined) return;

	//if the node is still connected, the component has been appened/added somewhere else in the DOM
	if (thisNode.isConnected === true) {
		let parentComponent = currentComponent._impressInternal.iParent;

		if (typeof currentComponent.afterPortedFrom === 'function') await currentComponent.afterPorted();
		if (parentComponent != undefined && typeof parentComponent.afterPorted === 'function') await parentComponent.afterPorted(currentComponent);
		return;
	}
	//TODO destroy all children - asycn promise issue
	//create a flattened array of the component tree starting from the currentComponent
	if (currentComponent._impressInternal.iChildren[0] === undefined) {
		_impress.destroyComponent(currentComponent);
	} else {
		let componentArray = [currentComponent];
		let j = 0;
		while (componentArray[j] !== undefined) {
			componentArray.push(...componentArray[j]._impressInternal.iChildren);
			j++;
		}
		//loop backwards and destroy all the components
		for (let i = componentArray.length - 1, component; (component = componentArray[i]) !== undefined; i--) {
			_impress.destroyComponent(component);
		}
	}
};

_impress.destroyComponent = async (currentComponent) => {
	if (typeof currentComponent.beforeDestroy === 'function') await currentComponent.beforeDestroy(currentComponent);
	//remove iChildren references in parent - TODO convert iChildren to Map
	if (currentComponent._impressInternal.iParent != undefined) {
		let childIndex = currentComponent._impressInternal.iParent._impressInternal.iChildren.indexOf(currentComponent);
		if (childIndex !== -1) currentComponent._impressInternal.iParent._impressInternal.iChildren.splice(childIndex, 1);
	}
	//remove dataOwner links to child - linked via the resolvedPath and component object as a map
	currentComponent._impressInternal.propsMaps.forEach((propsMap, propName) => {
		let dataPath = propsMap.resolvedPath;

		if (propsMap.dataOwner._impressInternal.observables.has(dataPath)) {
			let dataMap = propsMap.dataOwner._impressInternal.observables.get(dataPath);
			if (dataMap.has(currentComponent)) dataMap.delete(currentComponent);
			if (dataMap.size === 0) propsMap.dataOwner._impressInternal.observables.delete(dataPath);
		}
	});
	//remove all listeners
	for (let index = 0; index < currentComponent._impressInternal.iEventNodes.length; index++) {
		currentComponent._impressInternal.iEventNodes[index].removeEventListener(currentComponent._impressInternal.iEventListener[index].listener, currentComponent._impressInternal.iEventListener[index]);
	}
	if (typeof currentComponent.afterDestroy === 'function') await currentComponent.afterDestroy(currentComponent);
	//ported nodes are not in their parent component - they must be removed manually
	if (currentComponent._impressInternal.iNode.isConnected === true) {
		let iNode = currentComponent._impressInternal.iNode;
		impressComponents.delete(currentComponent._impressInternal.iGuid);
		iNode.parentNode.removeChild(iNode);
	} else {
		impressComponents.delete(currentComponent._impressInternal.iGuid);
	}
};

////////////////////////////////////////////////////////////////////////////////
//DATA OBSERVER FUNCTIONS

/**
 * NOT USED
 * @param {Object} currentComponent
 * @returns
 */
_impress.getTextNodes = (currentComponent) => {
	let iTextNodes = [];
	let treeWalker = document.createNodeIterator(currentComponent._impressInternal.iNode, NodeFilter.SHOW_TEXT, (node) => {
		return node.nodeValue.includes('{data.') || node.nodeValue.includes('{props.') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
	});
	let n;
	while ((n = treeWalker.nextNode())) {
		iTextNodes.push(n);
	}
	return iTextNodes;
};

/**
 * @private
 * @description
 * sets the data observers on the current component
 * @param {Object} currentComponent
 * @param {String} dataPath
 */
_impress.createDataObserver2 = (currentComponent, dataPath, dataTarget = currentComponent, mapValue) => {
	if (currentComponent._impressInternal.observables.has(dataPath) === false) {
		if (mapValue != undefined) currentComponent._impressInternal.observables.set(dataPath, new Map([[dataTarget, [mapValue]]]));
		else currentComponent._impressInternal.observables.set(dataPath, new Map([[dataTarget, []]]));
	} else {
		if (currentComponent._impressInternal.observables.get(dataPath).has(dataTarget) === false) {
			if (mapValue != undefined) currentComponent._impressInternal.observables.get(dataPath).set(dataTarget, [mapValue]);
			else currentComponent._impressInternal.observables.get(dataPath).set(dataTarget, []);
		} else if (mapValue != undefined) {
			let observerArray = currentComponent._impressInternal.observables.get(dataPath).get(dataTarget);

			if (observerArray.indexOf(mapValue) === -1) currentComponent._impressInternal.observables.get(dataPath).get(dataTarget).push(mapValue);
		}
	}
};

//PROPS

/**
 * TODO
 * Maps props to data and sets observers on the dataOwner
 * @param {Object} currentComponent
 */
_impress.setiPropsMaps = (currentComponent) => {
	let attributes = currentComponent._impressInternal.iNode.attributes;
	let parentComponent = currentComponent._impressInternal.iParent;
	if (parentComponent != undefined) {
		for (let attribute of attributes) {
			if (attribute.value.indexOf('{data.') === 0 || attribute.value.indexOf('{props.') === 0) {
				let propsName = 'props.' + attribute.name;
				let dataPath = attribute.value.substring(1, attribute.value.length - 1);

				let propsMap = _impress.getLookupDataMap(parentComponent, dataPath, _impress.newGUID(), propsName);

				if (currentComponent._impressInternal.propsMaps.has(propsName) === false) {
					currentComponent._impressInternal.propsMaps.set(propsName, propsMap);
					_impress.createDataObserver2(propsMap.dataOwner, propsMap.resolvedPath, currentComponent, propsMap);
				} else {
					throw new Error(`iMpress error ---  prop: "${propsName}" has been declared twice on component: "${currentComponent._impressInternal.name}"`);
				}
			}
			//currentComponent._impressInternal.iNode.removeAttribute(attribute.name);
		}
	}
};

//REACTIVE DATA

/**
 * @private
 * @description
 * sets data. and prop. observables to the component for text <span> nodes
 * scans the text nodes in the template and adds targets for the observables
 * TODO - NEW
 * @param {Object} currentComponent
 */
_impress.setiReactiveMaps = (currentComponent) => {
	let iObject = impressObjects.get(currentComponent._impressInternal.name);

	iObject._ireactive.forEach((reactiveMap, key) => {
		if (reactiveMap.resolvedPath != undefined) {
			//if path is resolved it contains only data - contains no props
			let clonedLookup = _impress.deepClone(reactiveMap);

			clonedLookup.dataOwner = currentComponent;
			_impress.createDataObserver2(currentComponent, clonedLookup.resolvedPath, currentComponent, clonedLookup);
			clonedLookup.lookupMap.forEach((value) => {
				value.dataOwner = currentComponent;
				_impress.createDataObserver2(currentComponent, value.observable, currentComponent, clonedLookup);
			});
			_impress.setReactiveDataToDOM(currentComponent, clonedLookup, true, true);
		} else {
			//props and mixed data props lookups
			if (reactiveMap.dataPath === reactiveMap.rootPath) {
				//if the rootPath is the same as the dataPath we must have a pure propsMap
				let propName = reactiveMap.rootPath;
				//the observable will already have been created in setiPropsMaps, push in the id of the text/attribute to observe
				if (currentComponent._impressInternal.propsMaps.has(propName) === true) {
					let observedPropsMap = currentComponent._impressInternal.propsMaps.get(propName);
					observedPropsMap.id.push(...reactiveMap.id);
					_impress.setReactiveDataToDOM(currentComponent, observedPropsMap, true);
				} else {
					throw new Error(`iMpress error ---  prop: "${propName}" is not defined on component: "${currentComponent._impressInternal.name}"`);
				}
			} else {
				// the lookup is a mix of data and props. The root of data or prop
				let clonedLookup = _impress.deepClone(reactiveMap);

				if (currentComponent._impressInternal.propsMaps.has(reactiveMap.rootPath) === true) {
					//root paths matches a prop
					let propName = reactiveMap.rootPath;
					let propsMap = currentComponent._impressInternal.propsMaps.get(propName);

					clonedLookup.dataPath = clonedLookup.dataPath.replace(propName, propsMap.dataPath);
					clonedLookup.dataOwner = propsMap.dataOwner;
				}
				//TODO
				clonedLookup.lookupMap.forEach((lookup, key) => {
					//resolve the sub-lookup maps which can be data or props
					if (lookup.dataPath[0] === 'd') {
						if (lookup.dataOwner == undefined) lookup.dataOwner = currentComponent;
					} else {
						if (currentComponent._impressInternal.propsMaps.has(lookup.dataPath) === true) {
							let propsMap = currentComponent._impressInternal.propsMaps.get(lookup.dataPath);
							lookup.dataOwner = propsMap.dataOwner;
							lookup.dataPath = propsMap.dataPath;
							lookup.observable = propsMap.rootPath;

							if (lookup.value == undefined) lookup.value = _impress.getValueFromLookup(lookup.dataOwner, lookup.dataPath, clonedLookup.lookupMap);
							propsMap.lookupMap.forEach((propLookup, guid) => {
								clonedLookup.lookupMap.set(guid, propLookup);
							});
							//TODO loop the lookup map of the propsmap and add to this lookup
						} else {
							throw new Error(`iMpress error ---  prop: "${lookup.observable}" is not defined on component: "${currentComponent._impressInternal.name}"`);
						}
					}
					if (lookup.value == undefined) lookup.value = _impress.getValueFromLookup(lookup.dataOwner, lookup.dataPath, clonedLookup.lookupMap);
					_impress.createDataObserver2(lookup.dataOwner, lookup.observable, currentComponent, clonedLookup);
				});
				if (clonedLookup.value == undefined) clonedLookup.value = _impress.getValueFromLookup(clonedLookup.dataOwner, clonedLookup.dataPath, clonedLookup.lookupMap);
				if (clonedLookup.resolvedPath == undefined) clonedLookup.resolvedPath = _impress.getResolvedPath(clonedLookup.dataPath, clonedLookup.lookupMap);

				_impress.createDataObserver2(clonedLookup.dataOwner, clonedLookup.resolvedPath, currentComponent, clonedLookup);
				_impress.setReactiveDataToDOM(currentComponent, clonedLookup, true);
			}
		}
	});
};

/**
 * sets a lookup map of reactive data to the DOM nodes in the id array of the map
 * @param {Object} lookup
 */
_impress.setReactiveDataToDOM = (currentComponent, lookup, isFirstSet = false, isSetAttributeOnly = false) => {
	for (let id of lookup.id) {
		if (id.name === 'TEXT') {
			if (isSetAttributeOnly === false) {
				let iNode = currentComponent._impressInternal.iNode.querySelector(`[i-data="${id.iGuid}"]`);
				if (iNode != undefined) iNode.textContent = lookup.value;
			}
		} else if (id.name.substring(0, 6) !== 'props.') {
			let iNode = currentComponent._impressInternal.iNode.querySelector(`[i-attribute="${id.iGuid}"]`);
			if (iNode != undefined) {
				if (isFirstSet === false && id.name === 'value' && iNode.localName === 'input') iNode.value = lookup.value;
				else iNode.setAttribute(id.name, lookup.value);
			}
		}
	}
};

////////////////////////////////////////////////////////////////////////////////
//IEVENTS//

/**
 * loops through the iEventMap and registers the eveng listeners for the component
 * @param {Object} currentComponent
 */
_impress.setiEventMaps = function (currentComponent) {
	let iObject = impressObjects.get(currentComponent._impressInternal.name);

	iObject._ievents.forEach((eventMap, iGuid) => {
		let eventNode = currentComponent._impressInternal.iNode.querySelector(`[i-attribute="${iGuid}"]`);

		eventMap.forEach((iEventArray, listener) => {
			for (let iEvent of iEventArray) {
				let fn = iEvent[0];
				let args = iEvent.slice(1);

				if (typeof currentComponent[fn] == 'function') {
					let index = currentComponent._impressInternal.iEventListener.push({});

					index--;
					currentComponent._impressInternal.iEventListener[index].listener = listener;
					currentComponent._impressInternal.iEventListener[index].handleEvent = (e) => {
						let argsToData = [];

						for (let i = 0, v; (v = args[i]) !== undefined; i++) {
							if (v === '$e' || v === '$event') {
								v = e;
							} else if (v === '$c' || v === '$component') {
								v = currentComponent;
							} else if (parseFloat(v) === Number(v)) {
								v = parseFloat(v);
							} else if (v === 'true' || v === 'false') {
								v = Boolean(v);
							} else if (v.indexOf('data.') === 0 || v.indexOf('props.') === 0) {
								let lookup = _impress.getLookupDataMap(currentComponent, v, null, 'EVENTHANDLER');
								v = lookup.value;
							}
							argsToData.push(v);
						}
						currentComponent[fn](...argsToData);
					};
					eventNode.addEventListener(listener, currentComponent._impressInternal.iEventListener[index]);
				} else {
					//finally throw an error is a matching method cannot be found on either the component or its prototype
					throw new Error(`iMpress warning ---  i-event "${listener}" method ${fn}() is not declared in "${currentComponent._impressInternal.name}" or on the prototype`);
				}
			}
		});
	});
};

////////////////////////////////////////////////////////////////////////////////
//UPDATE STATE//

/**
 * @private
 * @description
 * Sets data or props state
 * props are mapped to data owner
 * @param {Object} currentComponent
 * @param {String} pathString
 */
_impress.setState = (currentComponent, pathString, value) => {
	if (pathString === 'data' || pathString == undefined) {
		currentComponent._impressInternal.observables.forEach((dataLookup, dataPath) => {
			_impress.refreshData(dataLookup, dataPath);
		});
	}
	if (pathString === 'props' || pathString == undefined) {
		currentComponent._impressInternal.propsMaps.forEach((propsMap, propsKey) => {
			propsMap.dataOwner._impressInternal.observables.forEach((dataLookup, dataPath) => {
				if (dataPath.indexOf(propsMap.resolvedPath) === 0) _impress.refreshData(dataLookup, dataPath);
			});
		});
	}
	if (pathString.indexOf('props.') === 0) {
		let propsMap = currentComponent._impressInternal.propsMaps.get(pathString);
		//if a value is given, sets the value to the data owner
		if (value.length > 0) {
			let dataPathArray = propsMap.resolvedPath.match(/[^\[\]\.\{\}]+/g);
			let lastPath = dataPathArray.pop();
			let dataObject = dataPathArray.reduce((acc, cur) => (acc = acc?.[cur]), propsMap.dataOwner);

			if (dataObject != undefined) dataObject[lastPath] = value[0];
		}
		propsMap.dataOwner._impressInternal.observables.forEach((dataLookup, dataPath) => {
			if (dataPath.indexOf(propsMap.resolvedPath) === 0) _impress.refreshData(dataLookup, dataPath);
		});
	} else if (pathString.indexOf('data.') === 0) {
		currentComponent._impressInternal.observables.forEach((dataLookup, dataPath) => {
			if (dataPath.indexOf(pathString) === 0) _impress.refreshData(dataLookup, dataPath);
		});
	}
};

/**
 * @private
 * @description
 * Called by setState to refresh an individual component data
 * TODO!!!
 * @param {Object} lookup
 * @param {String} dataPath e.g data.array.0
 */
_impress.refreshData = (lookup, dataPath) => {
	//TODO
	//console.log('REFRESH');
	//console.log(dataPath, lookup);

	lookup.forEach((dataMaps, dataTarget) => {
		for (let i = 0, dataMap; (dataMap = dataMaps[i]) !== undefined; i++) {
			//change the resolved path is the lookup has changed - this happens with a compound prop or data lookup i.e. props.array[props.index]
			let previousValue = dataMap.value;

			if (dataPath !== dataMap.rootPath) {
				let oldResolvedPath = dataMap.resolvedPath;
				_impress.refreshLookupDataMap(dataMap);
				if (dataMap.resolvedPath !== oldResolvedPath && dataMap.dataOwner._impressInternal.observables.has(oldResolvedPath)) {
					let observer = dataMap.dataOwner._impressInternal.observables.get(oldResolvedPath);
					dataMap.dataOwner._impressInternal.observables.delete(oldResolvedPath);
					dataMap.dataOwner._impressInternal.observables.set(dataMap.resolvedPath, observer);
				}
			}
			//dataMap values based on object previosuValue === newValue as mutation of object reference - no deepCloning is done
			let value = _impress.getValueFromLookup(dataMap.dataOwner, dataMap.dataPath, dataMap.lookupMap);
			dataMap.value = value;
			let i = dataMap.id.length;
			while (i--) {
				let id = dataMap.id[i];
				if (id.name === 'TEXT') {
					if (previousValue !== value) _impress.refreshTextNodes(dataTarget, id.iGuid, value);
					_impress.refreshTextNodes(dataTarget, id.iGuid, value);
				} else if (id.name.substring(0, 6) !== 'props.') {
					_impress.refreshAttribute(dataTarget, id.iGuid, id.name, value);
				} else {
					//id.name is "props.?" - call any observers
					if (typeof dataTarget._impressInternal.observers[id.name] === 'function') dataTarget._impressInternal.observers[id.name].call(dataTarget, value, previousValue);
					if (typeof dataTarget.afterUpdated === 'function') dataTarget.afterUpdated();
				}
			}
			if (typeof dataMap.dataOwner._impressInternal.observers[dataPath] === 'function') dataTarget._impressInternal.observers[dataPath].call(dataTarget, value, previousValue);
			if (typeof dataMap.dataOwner.afterUpdated === 'function') dataMap.dataOwner.afterUpdated();
		}
	});
};

/**
 * @public
 * @description
 * refreshes all the text nodes of local dataName mapped to the data owner state change
 * @param {Object} component
 * @param {String} iGuid
 * @param {*} value
 */
_impress.refreshTextNodes = (component, iGuid, value) => {
	let textNode = component._impressInternal.iNode.querySelector(`[i-data="${iGuid}"]`);
	textNode.textContent = value;
};

/**
 * @private
 * @description
 * refreshes an attribute - called by refresh data
 * @param {Object} currentComponent
 * @param {String} iGuid
 * @param {String} name
 * @param {*} value
 */
_impress.refreshAttribute = (currentComponent, iGuid, name, value) => {
	let attrNode = currentComponent._impressInternal.iNode.querySelector(`[i-attribute="${iGuid}"]`);

	if (name === 'value' && attrNode.localName === 'input') attrNode.value = value;
	else attrNode.setAttribute(name, value);
};

////////////////////////////////////////////////////////////////////////////////
//HELPER FUNCTIONS — conversion of template strings to Objects

//NEW
/**
 * gets the ultimate value of a dataPath from the lookupMap
 * @param {Object} currentComponent
 * @param {String} dataPath
 * @param {Map} lookupMap
 * @returns
 */
_impress.getValueFromLookup = (currentComponent, dataPath, lookupMap) => {
	let dataPathArray = dataPath.match(/[^\[\]\.\{\}]+/g);
	let value = dataPathArray.reduce((acc, cur) => (acc = cur[0] !== '#' ? acc?.[cur] : acc?.[lookupMap.get(cur)?.value]), currentComponent);
	return value;
};

/**
 * Resolves a path removing nesting into original data when the value of the lookups has been determined
 * @param {*} currentComponent
 * @param {*} dataPath
 * @param {*} lookupMap
 * @returns
 */
_impress.getResolvedPath = (dataPath, lookupMap) => {
	let resolvedPath = dataPath.replace(/(\[)(#[^\]]+)(\])/g, (lookup, p1, p2) => `.${lookupMap.get(p2)?.value}`);
	return resolvedPath;
};

/**
 * refreshes s lookup object data map
 * @param {Object} lookup
 */
_impress.refreshLookupDataMap = (reactiveMap) => {
	reactiveMap.lookupMap.forEach((lookupMap, iGuid) => {
		lookupMap.value = _impress.getValueFromLookup(lookupMap.dataOwner, lookupMap.dataPath, lookupMap);
	});
	reactiveMap.value = _impress.getValueFromLookup(reactiveMap.dataOwner, reactiveMap.dataPath, reactiveMap.lookupMap);
	reactiveMap.resolvedPath = _impress.getResolvedPath(reactiveMap.dataPath, reactiveMap.lookupMap);
};

/**
 * gets a data lookup map of a dataPath string
 * decodes nested paths into linear paths and constructs a lookup array chain
 * @param {Object} currentComponent
 * @param {String} str
 * @returns {Object}
 */
_impress.getLookupDataMap = (currentComponent, str, iGuid, name = 'TEXT') => {
	let i = 0;
	let nestedDataStartIndexes = [];
	let lookupMap = new Map();

	//first loop - find indexes in the string of data. and props.
	while (i++ < str.length) {
		let nestedDataIndex = str.indexOf('[data.', i);
		let nestedPropsIndex = str.indexOf('[props.', i);
		if (nestedDataIndex === -1) nestedDataIndex = Infinity;
		if (nestedPropsIndex === -1) nestedPropsIndex = Infinity;
		//find index of closing "]"
		if (nestedDataIndex < nestedPropsIndex) {
			i = nestedDataIndex + 1;
			nestedDataStartIndexes.push(i);
		} else if (nestedPropsIndex < nestedDataIndex) {
			i = nestedPropsIndex + 1;
			nestedDataStartIndexes.push(i);
		}
	}

	//isResolvableValue is only true for a dataPath that contains no props - these are immediately resolvable
	let isResolvableValue = name.substring(0, 6) === 'props.' || name === 'EVENTHANDLER' || (str.includes('[props.') === false && str.indexOf('props.') !== 0) ? true : false;
	let dataOwner = currentComponent?._impressInternal?.iNode != undefined ? currentComponent : undefined;

	//second loop backwards and replace the nested data with lookups
	for (let j = nestedDataStartIndexes.length - 1, startIndex; (startIndex = nestedDataStartIndexes[j]) !== undefined; j--) {
		let i = startIndex;
		let endIndex = 0;
		let bracketCount = 0;

		while (i++ < str.length && endIndex === 0) {
			if (str[i] === ']') {
				if (bracketCount === 0) {
					endIndex = i;
					let newGuid = _impress.newGUID();
					let dataPath = str.substring(startIndex, endIndex);
					let value;
					let observable = dataPath.replace(/\[.*/, '');
					let subdataOwner = dataOwner;

					if (dataOwner == undefined) {
						if (dataPath[0] === 'd' && dataPath.includes('[#') === false) value = _impress.getValueFromLookup(currentComponent, dataPath, lookupMap);
					} else {
						if (dataPath[0] === 'd') {
							value = _impress.getValueFromLookup(currentComponent, dataPath, lookupMap);
						} else if (dataPath[0] === 'p') {
							//switch the propsMap for the true dataMap
							let propsMap = dataOwner._impressInternal.propsMaps.get(dataPath);

							dataPath = dataPath.replace(observable, propsMap.resolvedPath);
							observable = dataPath.replace(/\[.*/, '');
							subdataOwner = propsMap.dataOwner;
							value = propsMap.value;
						}
					}

					lookupMap.set(newGuid, { dataPath: dataPath, observable: observable, dataOwner: subdataOwner, value: value });
					str = `${str.slice(0, startIndex)}${newGuid}${str.slice(endIndex)}`;
				} else {
					bracketCount--;
				}
			} else if (str[i] === '[') {
				bracketCount++;
			}
		}
	}
	//set to undefined or 'not-resolved'
	let value = undefined;
	let resolvedPath = undefined;
	let rootPath = str.match(/props\.[^\[\.]+|data\.[^\[\.]+/)[0];
	let reactiveMap = { id: [{ iGuid: iGuid, name: name }], dataPath: str, dataOwner: dataOwner, rootPath: rootPath, resolvedPath: resolvedPath, lookupMap: lookupMap, value: value };

	if (isResolvableValue === true) {
		if (reactiveMap.rootPath[0] === 'p') {
			let propsName = reactiveMap.rootPath;

			if (reactiveMap.dataOwner._impressInternal.propsMaps.has(propsName)) {
				let parentPropsMap = reactiveMap.dataOwner._impressInternal.propsMaps.get(propsName);
				reactiveMap.dataOwner = parentPropsMap.dataOwner;
				reactiveMap.dataPath = reactiveMap.dataPath.replace(reactiveMap.rootPath, parentPropsMap.rootPath);
				reactiveMap.rootPath = parentPropsMap.rootPath;
			} else {
				throw new Error(`iMpress error ---  prop: "${propsName}" been passed into: "${currentComponent._impressInternal.name} but does not exist on "${parentComponent._impressInternal.name}"`);
			}
			value = _impress.getValueFromLookup(reactiveMap.dataOwner, reactiveMap.dataPath, reactiveMap.lookupMap);
		} else {
			value = _impress.getValueFromLookup(currentComponent, reactiveMap.dataPath, reactiveMap.lookupMap);
		}
		resolvedPath = _impress.getResolvedPath(reactiveMap.dataPath, reactiveMap.lookupMap);
	}
	reactiveMap.resolvedPath = resolvedPath;
	reactiveMap.value = value;
	return reactiveMap;
};

//get Object and Property value from dataPath
/**
 * @private
 * @description
 * returns the object and property of a dataPath string or dataPathArray
 * @param {Object} obj
 * @param {Array | String} dataPath
 * @returns
 */
_impress.objectPath = (obj, dataPath = []) => {
	let path = typeof dataPath === 'string' ? dataPath.match(/[^\[\]\.\{\}]+/g) : dataPath;
	let i = 0;
	let len = path.length - 1;
	let final = path[len];

	while (obj != undefined && i < len) {
		obj = obj[path[i]];
		i++;
	}

	return obj.hasOwnProperty(final) === true ? { dataObject: obj, dataProperty: final } : undefined;
};

//Generate a new unique indentifier
_impress.newGUID = function () {
	_iGuid += 5;
	return `#${_iGuid.toString(36)}`;
};

//Remove newline/return and extraneous spaces, including trimming spaces from datamatches
_impress.correctHtml = function (template) {
	if (template) {
		template = template.replace(/[\r\n]/g, ' ');
		template = template.replace(/\>\s+(?=<)/g, '>');
		template = template.replace(/<\s+/g, '<');
		template = template.trim();

		let dataMatches = template.match(/[^\{]+?(?=})/g);
		if (dataMatches) {
			for (let i = 0; i < dataMatches.length; i++) {
				let correctedData = dataMatches[i].trim();
				template.replace(`{${dataMatches[i]}}`, `{${correctedData}}`);
			}
		}
		return template;
	}
};

/**
 * sets the iObject._iattributes and iObject._ievents Maps
 * @param {Object} iObject
 * @param {Array} attributeArray
 */
_impress.setTemplateAttributeMaps = (iObject, attributeArray, iGuid) => {
	for (let attr of attributeArray) {
		let [name, value] = attr.split('=');

		//handle events and data attribuets separately
		if (name === 'i-event') {
			value = JSON.parse(value);
			let entries = Object.entries(value);
			if (iObject._ievents.has(iGuid) === false) iObject._ievents.set(iGuid, new Map());
			let eventMap = iObject._ievents.get(iGuid);

			for (let entry of entries) {
				let [key, value] = entry;
				key = key.trim();
				value = value.replace('()', '').replace('(', ',').replace(')', '').split(',');
				let i = value.length;
				while (i--) {
					value[i] = value[i].trim();
				}
				if (value.length === 1) value.push('$e');
				if (eventMap.has(key)) eventMap.get(key).push(value);
				else eventMap.set(key, [value]);
			}
		} else {
			let dataPath = value.substring(1, value.length - 1);
			let data = typeof iObject.data === 'function' ? { data: iObject.data() } : { data: iObject.data };

			if (iObject._ireactive.has(dataPath) === true) {
				let lookupMap = iObject._ireactive.get(dataPath);
				lookupMap.id.push({ iGuid: iGuid, name: name });
			} else {
				let lookupMap = _impress.getLookupDataMap(data, dataPath, iGuid, name);
				iObject._ireactive.set(dataPath, lookupMap);
			}
		}
	}
};

/**
 * @private
 * @description
 * converts the template string into iMpress HTML
 * looks for data/props/i-event references and creates an i-attribute lookup reference
 * tags of the iMpress components e.g. <i-child myProp={data.myData}> do not get converted
 * we can detect iMpress tags as custom element - hyphenated and they are loaded into the component store
 * @param {*} iObject
 * @returns
 */
_impress.iAttributesHtml = function (iObject) {
	let { template, name } = iObject;
	let data = typeof iObject.data === 'function' ? { data: iObject.data() } : { data: iObject.data };
	let tempLines;
	let currentComponentNames = impressObjects.keys();
	let skipComponentCount = 0;

	let wrapInSpan = function (match) {
		let _iGuid = _impress.newGUID();
		let dataPath = match.substring(1, match.length - 1);
		let lookupMap;

		if (iObject._ireactive.has(dataPath) === true) {
			lookupMap = iObject._ireactive.get(dataPath);
			lookupMap.id.push({ iGuid: _iGuid, name: 'TEXT' });
		} else {
			lookupMap = _impress.getLookupDataMap(data, dataPath, _iGuid, 'TEXT');
			iObject._ireactive.set(dataPath, lookupMap);
		}

		//if a path is resolvable it contains no props references and can be substituted into the template markup
		if (lookupMap.resolvedPath == undefined) return `<span i-data="${_iGuid}">${match}</span>`;
		else return `<span i-data="${_iGuid}">${lookupMap.value}</span>`;
	};

	let isComponent = function (tagLine, componentNamesIterator, isEndTag = false) {
		for (let componentName of componentNamesIterator) {
			if (isEndTag === false && tagLine.indexOf(`<${componentName}`) === 0) return true;
			if (isEndTag === true && tagLine.indexOf(`</${componentName}`) === 0) return true;
		}
		return false;
	};

	tempLines = template.match(/(<[^>]+)>|[^<>]+/g);

	for (let i = 0, tLen = tempLines.length; i < tLen; i++) {
		let v = tempLines[i];

		//skip child component content
		if (isComponent(v, currentComponentNames, true)) {
			skipComponentCount--;
			continue;
		}
		if (skipComponentCount > 0) continue;

		if (v[0] === '<') {
			//tag line - first exclude any component tags within a parent template - those are handled by the child
			if (isComponent(v, currentComponentNames) === true) {
				skipComponentCount++;
				if (v.includes('/>')) skipComponentCount--;
				continue;
			}

			//identify tags with attributes containing data/props/i-events
			if (v.includes('{props.') || v.includes('{data.') || v.includes('i-event')) {
				let tag = v.match(/<[^\s]+/);
				tag = tag[0].slice(1);
				//test tagline for attribute match, get new GUID if present, remove attributes from tagline
				let attr = v.match(/[a-z-]+={[^}]+}/g);

				if (attr != undefined && !impressObjects.get(tag)) {
					let _iGuid = _impress.newGUID();
					let vAttrIndex = 0;
					let vAttrLength = attr.length;

					_impress.setTemplateAttributeMaps(iObject, attr, _iGuid);

					while (vAttrIndex < vAttrLength) {
						//replace the attribute in the markup with a reference
						if (vAttrIndex === 0) tempLines[i] = tempLines[i].replace(attr[vAttrIndex], `i-attribute="${_iGuid}"`);
						else tempLines[i] = tempLines[i].replace(attr[vAttrIndex], '');
						vAttrIndex++;
					}
				}
			}
		} else if (v.includes('{props.') || v.includes('{data.')) {
			//tag content - i.e. textline wrap in span
			tempLines[i] = tempLines[i].replace(/{data\.[^}]+}|{props\.[^}]+}/g, wrapInSpan);
		}
	}
	template = tempLines.reduce((t, c) => (t += c));
	return template;
};

//HELPERS

/**
 * @private
 * @description
 * sets a value to an object/array
 * for missing properties it will default to create a new object not an array
 * @param {*} value
 * @param {Object} obj
 * @param  {...String | Number} path
 */
_impress.set = (value, obj, ...path) => {
	let i = 0;
	let len = path.length - 1;
	while (obj != undefined && i < len) {
		if (obj[path[i]] === undefined) obj[path[i]] = {};
		obj = obj[path[i]];
		i++;
	}
	if (obj && i === len) {
		obj[path[i]] = value;
	}
};

/**
 * @public
 * @description
 * universal safe get, returns undefined if property is not valid
 * @param {Object} obj
 * @param  {...String} path
 * @returns {*}
 */
_impress.get = (obj, ...path) => {
	let i = 0;
	let len = path.length - 1;
	while (obj != undefined && i < len) {
		obj = obj[path[i]];
		i++;
	}
	return obj && i === len ? obj[path[i]] : undefined;
};

/**
 * @private
 * @description
 * clones and object or array with the option to deep freeze the clone
 * @param {Object} source
 * @param {Object} optionsObject
 * @param {Object} target
 * @param {Array} sourceArray
 * @param {Array} targetArray
 * @returns {Object}
 */
_impress.deepClone = (source, optionsObject = {}, target = Array.isArray(source) ? [] : {}, sourceArray = [source], targetArray = [target]) => {
	if (source != undefined) {
		let sourceObjectsArray = [];
		let targetObjectsArray = [];

		for (let j = 0, jLen = sourceArray.length; j < jLen; j++) {
			let keys = sourceArray[j];
			let isArray = false;
			let isMap = false;

			if (Array.isArray(sourceArray[j]) === true) isArray = true;
			else if (sourceArray[j] instanceof Map) isMap = true;
			else keys = Object.keys(sourceArray[j]);

			for (let key of keys) {
				let value;
				if (isArray === true) value = key;
				else if (isMap === true) [key, value] = key;
				else value = sourceArray[j][key];

				let isPrimitiveType = value == undefined || (typeof value !== 'object' && typeof value !== 'function');
				let newValue = value;

				if (isPrimitiveType === false) {
					let propertyType = Object.prototype.toString.call(value);

					switch (propertyType) {
						case '[object Object]':
							newValue = {};
							sourceObjectsArray.push(value);
							targetObjectsArray.push(newValue);
							break;
						case '[object Array]':
							newValue = [];
							sourceObjectsArray.push(value);
							targetObjectsArray.push(newValue);
							break;
						case '[object Map]':
							newValue = new Map();
							sourceObjectsArray.push(value);
							targetObjectsArray.push(newValue);
							break;
						case '[object File]':
							newValue = new File([value], value.name, { type: value.type });
							break;
						case '[object Blob]':
							newValue = new Blob([value], { type: value.type });
							break;
						default:
							newValue = undefined;
					}
				}
				if (isArray === true) targetArray[j].push(newValue);
				else if (isMap === true) targetArray[j].set(key, newValue);
				else targetArray[j][key] = newValue;
			}
			if (optionsObject.freeze === true) Object.freeze(target[j]);
		}
		if (sourceObjectsArray.length === 0) {
			return target;
		} else {
			return _impress.deepClone(source, optionsObject, target, sourceObjectsArray, targetObjectsArray);
		}
	}
};

/*_impress.iQuery = (component, query) => {
	let componentArray = component._impressInternal.iChildren;
	let result;
	let i = 0;
	while (componentArray[i] != undefined){
		let keys = Object.keys(query);
		if (_impress.get(componentArray[i], query){
			result = componentArray[i];
		} else {
			componentArray.push(...componentArray[i]._impressInternal.iChildren);
		}
		if (result != undefined) break; 
		i++;
	}
	return result;
}*/

/*_impress.iQueryAll = (component, query) => {
	let componentArray = component._impressInternal.iChildren;
	let result = [];
	let i = 0;
	while (componentArray[i] != undefined){
		let keys = Object.keys(query);
		if (_impress.get(componentArray[i], query){
			result.push(componentArray[i]);
		} else {
			componentArray.push(...componentArray[i]._impressInternal.iChildren);
		}
		i++;
	}
	return result;
}*/

//CLASSES///////////////////////////////////////////////////////////////////////
//
const impressObjects = new Map();
const impressComponents = new Map();

class IMPRESSOBJECT {
	constructor(impressDefinitionObject) {
		this.name = impressDefinitionObject.name;
		this.data = impressDefinitionObject.data;
		if (Array.isArray(impressDefinitionObject.common)) {
			let commonMethods = impressDefinitionObject.common.map((v) => v.methods || {});
			this.methods = Object.assign({}, ...commonMethods, impressDefinitionObject.methods);
		} else this.methods = impressDefinitionObject.methods || {};
		if (Array.isArray(impressDefinitionObject.common)) {
			let commonObservers = impressDefinitionObject.common.map((v) => v.observers || {});
			this.observers = Object.assign({}, ...commonObservers, impressDefinitionObject.observers);
		} else this.observers = impressDefinitionObject.observers || {};

		//maps
		this._ireactive = new Map();
		this._iattributes = new Map();
		this._ievents = new Map();

		if (impressDefinitionObject.template != undefined && impressDefinitionObject.template !== '') {
			this.template = _impress.correctHtml(impressDefinitionObject.template);
			this.template = _impress.iAttributesHtml(this);
		} else {
			this.template = '';
		}
		this.templateNode = document.createElement('template');
		this.templateNode.innerHTML = this.template;
	}
}

class IMPRESSCOMPONENT {
	constructor(iNode) {
		let name = iNode.localName;
		let iObject = impressObjects.get(name);
		//PUBLIC
		this.data = typeof iObject.data === 'function' ? iObject.data() : _impress.deepClone(iObject.data);
		Object.assign(this, iObject.methods);

		//PRIVATE
		let iParent = _impress.findParentComponentByNode(iNode);
		let iRoot = iParent == undefined ? this : iParent.iRoot;
		this._impressInternal = {
			name: name,
			iGuid: _impress.newGUID(),
			isMounted: false,
			iEventNodes: [],
			iEventListener: [],
			propsMaps: new Map(),
			observables: new Map(),
			observers: iObject.observers,
			iNode: iNode,
			iParent: iParent,
			iRoot: iRoot,
			iChildren: []
		};
		this._impressInternal.iNode.setAttribute('i-guid', this._impressInternal.iGuid);
		impressComponents.set(this._impressInternal.iGuid, this);
	}
	setState(data, ...value) {
		_impress.setState(this, data, value);
	}
	getPropsMap(pathString) {
		let propsMap = this._impressInternal.propsMaps.get(pathString);
		//if a value is given, sets the value to the data owner
		let dataPathArray = propsMap.resolvedPath.match(/[^\[\]\.\{\}]+/g);
		let lastPath = dataPathArray.pop();
		let dataObject = dataPathArray.reduce((acc, cur) => (acc = acc?.[cur]), propsMap.dataOwner);

		return { dataOwner: propsMap.dataOwner, fullPath: propsMap.resolvedPath, dataObject: dataObject, dataProperty: lastPath };
	}
	getProps() {
		let props = {};
		this._impressInternal.propsMaps.forEach((lookup, key) => {
			let propName = key.replace('props.', '');
			props[propName] = lookup.value;
		});
		return props;
	}
	destroy() {
		IMPRESS.destroyComponent(this);
	}
}

//IN-BUILT COMPONENTS

//I-FOR
const iForMethods = {
	beforeCreate: function () {
		try {
			let childDefinitionNode = this._impressInternal.iNode.childNodes[0];

			if (childDefinitionNode == undefined || impressObjects.get(childDefinitionNode.localName) == undefined) {
				throw new Error(`iMpress error - i-for component: ${this.iGuid} - requires a valid custom element component child.`);
			}
			this.data.componentName = childDefinitionNode.localName;
			this.data.propsPassThroughs = '';
			this.data.guidArray = [];
			for (let i = 0, attr; (attr = childDefinitionNode.attributes[i]) !== undefined; i++) {
				if (attr.localName !== 'i-guid') {
					if (/{\s*props.array\[i\]\s*}/.test(attr.value) === true) this.data.value = attr.localName;
					else this.data.propsPassThroughs += `${attr.localName}="${attr.value}"`;
				}
				this.data.propsPassThroughs += ' ';
			}
			this.data.propsPassThroughs = this.data.propsPassThroughs.trim();

			if (this.data.value == undefined) throw new Error(`iMpress error - i-for component: ${this._impressInternal.iGuid} - please define iterable prop - ?={props.array[i]}.`);
			else this.data.vPropName = `props.${this.data.value}`;
			this._impressInternal.iNode.innerHTML = '';
		} catch (error) {
			console.error(error);
			this.destroy();
		}
	},
	afterMounted: function () {
		try {
			let props = this.getProps();
			if (props.array == undefined || Array.isArray(props.array) === false) throw new Error(`iMpress error - i-for component: ${this.iGuid} - a valid array must be set.`);
			this.iForChildrenRefresh(props.array);
		} catch (error) {
			console.error(error);
			this.destroy();
		}
	},
	afterPorted: function (child) {
		//porting of nodes is not permitted for direct children of an i-for due to DOM tracking - children will be destroyed if ported into or out of an i-for
		if (child._impressInternal.iNode.parentNode === this._impressInternal.iNode && child._impressInternal.iParent === this) {
			//let props = this.getProps();
			//let item = props.array.splice(childIndex, 1);
			//props.array.splice(siblingChildIndex, 0, item);
		} else {
			child.destroy();
		}
	},
	iForChildrenRefresh: function (arr) {
		if (this._impressInternal.iChildren.length === arr.length) {
			return;
		} else if (this._impressInternal.iChildren.length < arr.length) {
			let html = '';
			for (let i = this._impressInternal.iChildren.length, item; (item = arr[i]) !== undefined; i++) {
				html += `<${this.data.componentName} ${this.data.value}={props.array[${i}]} ${this.data.propsPassThroughs}></${this.data.componentName}>`;
			}
			this._impressInternal.iNode.insertAdjacentHTML('beforeend', html);
		} else {
			for (let i = this._impressInternal.iChildren.length - 1; i >= arr.length; i--) {
				this._impressInternal.iChildren[i].destroy();
			}
		}
	}
};

const iForObservers = {
	'props.array': function (value, previousValue) {
		//if the previousValue !== the currentValue a new array has been created
		if (value !== previousValue) {
			this._impressInternal.iChildren = [];
			this._impressInternal.iNode.innerHTML = '';
		}
		//for (let i = 0, ilen = this._impressInternal.iChildren.length; i < ilen; i++) {
		//	let currentChildValue = this._impressInternal.iChildren[i]._impressInternal.propsMaps.get('props.child').value;
		//	let newChildIndex = value.indexOf(currentChildValue);			
		//}
		this.iForChildrenRefresh(value, this.data.componentName);
	}
};

IMPRESS.create({ name: 'i-for', methods: iForMethods, observers: iForObservers, data: {} });
//I-FOR

console.log('impressObjects', impressObjects);
console.log('impressComponents', impressComponents);
