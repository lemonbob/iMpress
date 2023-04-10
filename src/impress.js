const impressObjects = new Map();
const impressComponents = new Map();

/**
 * debug module including error handling
 *
 * @format
 */

//PUBLIC
const $idebug = {};

//PRIVATE
const _idebug = {};
const _idebugMap = new Map();

//IMPLEMENTATION
//PRIVATE
_idebug.getValueFromResolvedPath = (currentComponent, dataPathArray) => {
	let value = dataPathArray.reduce((acc, cur) => {
		if (acc instanceof Map || acc instanceof Set) acc = acc.get(cur);
		else acc = acc?.[cur];
		return acc;
	}, currentComponent);
	return value;
};

//PUBLIC
/**
 * console.error a message from iMpress to aid in debugging
 */
$idebug.error = (errorCode, currentComponent, ...args) => {
	switch (errorCode) {
		case 'setiPropsMaps':
			throw new Error(`iMpress error --- props ${args[0]}="${args[1]}" is declared on ${currentComponent.name} but "${args[1]}" cannot be found on parent or super parent`);
		case 'setiEventMaps':
			throw new Error(`iMpress warning --- i-event "${args[0]}" method ${args[1]}() is not declared in "${currentComponent?.name}" or parent passthroughs`);
		case 'i-for':
			throw new Error(`iMpress error --- i-for component: ${currentComponent._impressInternal.iGuid} - a valid iteratable must be set (Array, Set, Map).`);
		case 'i-if':
			throw new Error(`iMpress error --- i-if component: ${currentComponent._impressInternal.iGuid} - does not have a valid reactive condition attribute.`);
		case 'getResolvedDataPathArrayWithResolvedKeys':
			throw new Error(`iMpress error --- "${args[0]}" is referenced on ${currentComponent.name} but cannot be found on parent or super parent`);
		case 'getReactiveMapFromBaseMap':
			throw new Error(`iMpress error --- "${args[0]}" is declared on ${currentComponent.name} but cannot be found on parent or super parent`);
		case 'templateType':
			throw new Error(`iMpress error --- ${currentComponent.name} - template is not typeof "string"`);
	}
};

/**
 * console.error a message from iMpress to aid in debugging
 */
$idebug.warn = (errorCode, currentComponent, ...args) => {
	switch (errorCode) {
		case 'mixin':
			console.warn(`iMpress warning --- mixin declared in ${currentComponent.name} is not of IMPRESS class type`);
			break;
	}
};

/**
 * record state change to the component - records last 10 changes
 * @param {Object} callerComponent
 * @param {Array} callerPathArray
 * @param {Object} resolvedDataOwner
 * @param {Array} resolvedPathArray
 * @param {*} value
 */
$idebug.setStateChangeLog = (callerComponent, callerPathArray, resolvedDataOwner, resolvedPathArray) => {
	let resolvedPath = resolvedPathArray.join('.');
	let value = null;
	try {
		value = structuredClone(_idebug.getValueFromResolvedPath(resolvedDataOwner, resolvedPathArray));
	} catch (error) {
		/** */
	}

	if (_idebugMap.has(resolvedDataOwner._impressInternal.iGuid) === false) _idebugMap.set(resolvedDataOwner._impressInternal.iGuid, new Map());

	let debugMap = _idebugMap.get(resolvedDataOwner._impressInternal.iGuid);
	if (debugMap.has(resolvedPath) === false) debugMap.set(resolvedPath, new Set());
	let debugMapPath = debugMap.get(resolvedPath);
	debugMapPath.add({ callerGuid: callerComponent._impressInternal.iGuid, callerName: callerComponent.name, callerPathArray: callerPathArray.join('.'), value: value, timestamp: Date.now() });

	if (debugMapPath.size > 10) {
		for (let item of debugMapPath) {
			debugMapPath.delete(item);
			break;
		}
	}
};

/**
 * record state change to the component - records last 10 changes
 * @param {Object | String} resolvedDataOwner
 * @param {Array} resolvedPathArray
 * @param {*} value
 */
$idebug.getStateChangeLog = (resolvedDataOwner, resolvedPathArray) => {
	let resolvedPath = resolvedPathArray.join('.');
	let iGuid = typeof resolvedDataOwner === 'string' ? resolvedDataOwner : resolvedDataOwner?._impressInternal?.iGuid;
	let debugMap = _idebugMap.get(iGuid);
	if (debugMap != undefined) return debugMap.get(resolvedPath);
};

/**
 * gets the state log of a component by iGuid
 * @param {String} iGuid
 * @param {Array | String} path
 * @returns
 */
$idebug.getStateChangeByGuid = (iGuid, path) => {
	if (typeof path === 'string') path = path.match(/[^\[\]\.\{\}]+/g);
	else path = path.slice();

	let component = impressComponents.get(iGuid);
	if (component != undefined) {
		let stateLog = component.iGetState(path);
		return stateLog;
	}
};

/**
 * adds the debug method to the window object
 */
$idebug.setGlobalMethod = (isSetWindowMethod = false) => {
	if (isSetWindowMethod) window.$idebug = $idebug.getStateChangeByGuid;
	else if (typeof window.$idebug === 'function') delete window.idebug;
};

/**
 * ireactive module for impress engine
 *
 * @format
 */

//PUBLIC
const $ireactive = {};

//PRIVATE
let _iGuid = 1000;

//IMPLEMENTATION
//PUBLIC
//Generate a new unique indentifier
$ireactive.newGUID = function () {
	_iGuid += 5;
	return `#${_iGuid.toString(36)}`;
};

//REACTIVE DATA UPDATE - FROM - _impress.setState()

/**
 * Loops all the children of a component and sets the data state
 * @param {Class} dataOwner
 * @param {Array} pathArray
 */
$ireactive.updateAllChildren = (dataOwner, pathArray) => {
	let childSetArray = [new Set([dataOwner])];
	let updatedMaps = new Set();
	let i = 0;

	while (childSetArray[i] != undefined) {
		let childSet = childSetArray[i];
		childSet.forEach((childComponent) => {
			if (childComponent._impressInternal.controlFlags.isSkipRefresh !== true) {
				let reactiveLookupMap = childComponent._impressInternal.reactiveLookupMaps.get(dataOwner);

				if (reactiveLookupMap != undefined) {
					reactiveLookupMap.forEach((reactiveSet, key) => {
						//the reactive set is a list of lookup paths e.g data/prop that link to reactiveMaps

						let keyArray = key.split('.');
						let isMatch = true;
						let keyIndex = 0;
						if (pathArray.length <= keyArray.length) {
							for (let j = 0; j < pathArray.length; j++) {
								let keyValue;
								if (keyArray[j] !== '?') {
									keyValue = keyArray[j];
								} else {
									keyValue = childComponent._impressInternal.keys[keyIndex];
									keyIndex++;
								}

								if (pathArray[j] !== keyValue) {
									isMatch = false;
									break;
								}
							}
						} else {
							isMatch = false;
						}

						if (isMatch === true) {
							reactiveSet.forEach((dataOrPropName) => {
								let reactiveMap = childComponent._impressInternal.reactiveMaps.get(dataOrPropName);
								//let previousValue = $ireactive.getValueFromLookup(reactiveMap.resolvedDataOwner, reactiveMap.reactiveSubMap, reactiveMap.resolvedDataPathArray, childComponent._impressInternal.keys);

								if (updatedMaps.has(reactiveMap) === false) {
									let oldResolvedPath = reactiveMap.resolvedPath;

									$ireactive.refreshLookupDataMap(childComponent, reactiveMap);
									//if the old resolved path !== the new one, the reactive map is dynamic
									if (reactiveMap.resolvedPath !== oldResolvedPath) {
										let resolvedReactiveLookupMap = childComponent._impressInternal.reactiveLookupMaps.get(reactiveMap.resolvedDataOwner);
										let dynamicSet = resolvedReactiveLookupMap.get(oldResolvedPath);

										dynamicSet.delete(dataOrPropName);
										if (dynamicSet.size === 0) resolvedReactiveLookupMap.delete(oldResolvedPath);

										$ireactive.setReactiveLookup(childComponent, reactiveMap.resolvedDataOwner, reactiveMap.resolvedPath, dataOrPropName);
									}
									updatedMaps.add(reactiveMap);
								}

								let newValue = $ireactive.getValueFromLookup(reactiveMap.resolvedDataOwner, reactiveMap.reactiveSubMap, reactiveMap.resolvedDataPathArray, childComponent._impressInternal.keys);
								if (reactiveMap.name.substring(0, 6) === 'props.') {
									let dataOwner = dataOrPropName.substring(0, 5) === 'slot.' ? childComponent._impressInternal.iParent : childComponent;
									$ireactive.setDataFromPath(dataOwner, reactiveMap.name.split('.'), newValue);
								}

								//TODO iCustomRenderer
								if (typeof childComponent.iRender === 'function') {
									childComponent.iRender(reactiveMap, false, newValue);
								} else {
									let node = dataOrPropName.substring(0, 5) === 'slot.' ? childComponent._impressInternal.iNode.host : childComponent._impressInternal.iNode;
									$ireactive.setReactiveDataToDOM(childComponent, node, reactiveMap, false, childComponent._impressInternal.keys);
								}
							});
						}
					});
				}
				//afterUpdate here
				if (typeof childComponent.afterUpdated === 'function') childComponent.afterUpdated();
				if (childComponent._impressInternal.iChildren.size > 0) childSetArray.push(childComponent._impressInternal.iChildren);
			} else {
				delete childComponent._impressInternal.controlFlags.isSkipRefresh;
			}
		});
		i++;
	}
};

//DOM METHODS

/**
 * sets a reactiveMap value to the DOM nodes in the targetMaps
 * @param {Object} reactiveMap
 */
$ireactive.setReactiveDataToDOM = (currentComponent, node, reactiveMap, isFirstSet = false, keys) => {
	let newValue = $ireactive.getValueFromLookup(reactiveMap.resolvedDataOwner, reactiveMap.reactiveSubMap, reactiveMap.resolvedDataPathArray, keys);

	reactiveMap.targetMap.forEach((type, iGuid) => {
		if (type === 'OBSERVER') {
			let observerFn = currentComponent._impressInternal.iObservers.get(reactiveMap.name);
			if (isFirstSet === false) {
				if (typeof currentComponent[observerFn] === 'function') currentComponent[observerFn](newValue);
				else if (typeof observerFn === 'function') observerFn(newValue);
			}
		} else if (type === 'TEXT') {
			$ireactive.refreshTextNodes(node, iGuid, newValue);
		} else if (type === 'STYLE') {
			let styleNode = node.querySelector('style');
			let regex = new RegExp(`/\\*${iGuid}\\*/.*/\\*${iGuid}\\*/`);

			styleNode.innerHTML = styleNode.innerHTML.replace(regex, `/*${iGuid}*/${newValue}/*${iGuid}*/`);
		} else if (type.substring(0, 5) !== 'props') {
			$ireactive.refreshAttribute(node, iGuid, type, newValue, isFirstSet);			
		}
	});
};

//REFRESH DATA METHODS

/**
 * @public
 * @description
 * refreshes all the text nodes of local dataName mapped to the data owner state change
 * @param {Object} node
 * @param {String} iGuid
 * @param {*} value
 */
$ireactive.refreshTextNodes = (node, iGuid, value) => {
	let textNode = node.querySelector(`[i-data="${iGuid}"]`);
	if (textNode != undefined) textNode.textContent = value;
};

/**
 * @private
 * @description
 * refreshes an attribute - called by refresh data
 * @param {Object} node
 * @param {String} iGuid
 * @param {String} name
 * @param {*} value
 */
$ireactive.refreshAttribute = (node, iGuid, name, value, isFirstSet) => {
	let attrNode = node.querySelector(`[i-attribute="${iGuid}"]`);
	if (attrNode != undefined) {
		if (name === 'i-html') attrNode.innerHTML = value;
		else if (isFirstSet === false && name === 'value' && attrNode.localName === 'input') attrNode.value = value;
		else attrNode.setAttribute(name, value);		
	}
};

/**
 * returns the root propMap of any given dataPath
 * @param {Object} reativeMaps
 * @param {Array} dataPathArray
 */
$ireactive.getPropMap = (currentComponent, reactiveSubMaps, dataPathArray) => {
	let rootProp = dataPathArray[1][0] === '#' ? reactiveSubMaps.get(dataPathArray[1]).value : dataPathArray[1];
	let propName = `props.${rootProp}`;
	let propMap = currentComponent._impressInternal.reactiveMaps.get(propName);
	return propMap;
};

/**
 * returns the root propMap of any given dataPath
 * @param {Object} reativeMaps
 * @param {Array} dataPathArray
 */
$ireactive.getResolvedDataPathArrayWithResolvedKeys = (currentComponent, reactiveSubMaps, dataPathArray) => {
	let rootProp = dataPathArray[1][0] === '#' ? reactiveSubMaps.get(dataPathArray[1]).value : dataPathArray[1];
	let propName = `props.${rootProp}`;
	let propMap = currentComponent._impressInternal.reactiveMaps.get(propName);

	if (propMap != undefined) {
		let resolvedDataPathArray = [...propMap.resolvedDataPathArray, ...dataPathArray.slice(2)];
		let keyIndex = 0;
		for (let i = 0; i < resolvedDataPathArray.length; i++) {
			if (resolvedDataPathArray[i] === '?') {
				resolvedDataPathArray[i] = currentComponent._impressInternal.keys[keyIndex];
				keyIndex++;
			}
		}
		return { resolvedDataPathArray: resolvedDataPathArray, resolvedDataOwner: propMap.resolvedDataOwner };
	} else {
		$idebug.error('getResolvedDataPathArrayWithResolvedKeys', currentComponent, propName);
	}
};

/**
 * gets the ultimate value of a dataPath from the reactiveMap
 * if an iterable is a Map or Set use
 * @param {Object} currentComponent
 * @param {String} dataPath
 * @param {Map} reactiveSubMap
 * @param {*} key
 * @returns
 */
$ireactive.getValueFromLookup = (currentComponent, reactiveSubMap, dataPath, keys) => {
	let keyIndex = 0;
	let dataPathArray = Array.isArray(dataPath) ? dataPath : dataPath.match(/[^\[\]\.\{\}]+/g);
	let value = dataPathArray.reduce((acc, cur) => {
		if (cur === '?') {
			if (acc instanceof Map) {
				acc = acc.get(keys[keyIndex]);
			} else if (acc instanceof Set) {
				acc = keys[keyIndex];
			} else acc = acc?.[keys[keyIndex]];
			keyIndex++;
		} else if (cur?.[0] !== '#') {
			if (acc instanceof Map) acc = acc.get(cur);
			else if (acc instanceof Set) acc = cur;
			else acc = acc?.[cur];
		} else {
			if (acc instanceof Map || acc instanceof Set) acc = acc.get(reactiveSubMap.get(cur)?.value);
			else acc = acc?.[reactiveSubMap.get(cur)?.value];
		}
		return acc;
	}, currentComponent);
	return value;
};

/**
 *
 * @param {Object} propMap
 * @param {Object} reactiveMap
 */
$ireactive.getResolvedDataPathArray = (propMap, reactiveMap = propMap) => {
	let resolvedDataPathArray = propMap != reactiveMap ? [...propMap.resolvedDataPathArray, ...reactiveMap.dataPathArray.slice(2)] : reactiveMap.dataPathArray.slice();

	for (let i = 0; i < resolvedDataPathArray.length; i++) {
		let path = resolvedDataPathArray[i];
		if (path === '?') resolvedDataPathArray[i] = '?';
		else if (path[0] === '#') {
			if (i === 1) {
				resolvedDataPathArray[i] = propMap.reactiveSubMap.get(path).value;
			} else {
				resolvedDataPathArray[i] = reactiveMap.reactiveSubMap.get(path).value;
			}
		}
	}
	return resolvedDataPathArray;
};

/**
 * check whether the resolved path of a props matched data ownership in the parent
 */
$ireactive.isComponentHasOwnData = (reactiveMap, keys) => {
	if (reactiveMap.resolvedDataOwner != undefined) {
		let trucatedDataPathArray = reactiveMap.resolvedDataPathArray.slice(0, reactiveMap.resolvedDataPathArray.length - 1);

		let lastPath = reactiveMap.resolvedDataPathArray[reactiveMap.resolvedDataPathArray.length - 1] !== '?' ? reactiveMap.resolvedDataPathArray[reactiveMap.resolvedDataPathArray.length - 1] : keys[keys.length - 1];
		let pathObject = $ireactive.getValueFromLookup(reactiveMap.resolvedDataOwner, undefined, trucatedDataPathArray, keys);
		if (pathObject != undefined) {
			if (pathObject instanceof Set || pathObject instanceof Map) {
				if (pathObject.has(lastPath)) return true;
			} else if (typeof pathObject === 'object') {
				if (Object.hasOwn(pathObject, lastPath)) return true;
			}
		}
	}
	return false;
};

//REACTIVE MAP LOOKUPS

/**
 * refreshes a lookup object data map
 * @param {Object} lookup
 */
$ireactive.refreshLookupDataMap = (currentComponent, reactiveMap) => {
	reactiveMap.reactiveSubMap.forEach((submap, iGuid) => {
		let subdataOwner = submap.dataOwner;
		let resolvedSubmapDataPathArray = submap.dataPathArray;

		if (submap.dataPathArray[0] === 'props') {
			let propMap = $ireactive.getPropMap(currentComponent, reactiveMap.reactiveSubMaps, submap.dataPathArray);

			resolvedSubmapDataPathArray = [...propMap.dataPathArray, ...dataPathArray.slice(2)];
			subdataOwner = propMap.dataOwner;
		}
		submap.value = $ireactive.getValueFromLookup(subdataOwner, reactiveMap.reactiveSubMap, resolvedSubmapDataPathArray);
	});
	//size > 0 indicates that the reactiveMap requires a resolvedPath
	if (reactiveMap.reactiveSubMap.size > 0) {
		if (reactiveMap.dataPathArray[0] === 'props') {
			let propMap = $ireactive.getPropMap(reactiveMap.dataOwner, reactiveMap.reactiveSubMap, reactiveMap.dataPathArray);
			let resolvedDataPathArray = $ireactive.getResolvedDataPathArray(propMap, reactiveMap);

			reactiveMap.resolvedDataOwner = propMap.resolvedDataOwner;
			reactiveMap.resolvedDataPathArray = resolvedDataPathArray;
		} else {
			let resolvedDataPathArray = $ireactive.getResolvedDataPathArray(reactiveMap);
			reactiveMap.resolvedDataPathArray = resolvedDataPathArray;
		}
	}
	reactiveMap.resolvedPath = reactiveMap.resolvedDataPathArray.join('.');
};

/**
 * Sets the lookup for the reactiveMap on the component
 * reactivePath becomes the key
 * affectedPath is the value/lookup for the corresponding reactiveMap.name
 * see updateAllChildren for useage
 * @param {Object} currentComponent
 * @param {String} reactivePath
 * @param {String} affectedPath
 */
$ireactive.setReactiveLookup = (currentComponent, dataOwner, reactivePath, affectedPath) => {
	if (currentComponent._impressInternal.reactiveLookupMaps.has(dataOwner) === false) {
		let newMap = new Map();
		currentComponent._impressInternal.reactiveLookupMaps.set(dataOwner, newMap);
		newMap.set(reactivePath, new Set([affectedPath]));
	} else {
		let reactiveMap = currentComponent._impressInternal.reactiveLookupMaps.get(dataOwner);
		if (reactiveMap.has(reactivePath)) reactiveMap.get(reactivePath).add(affectedPath);
		else reactiveMap.set(reactivePath, new Set([affectedPath]));
	}
};

/**
 * sets a reactive map to the internal data and assigns the lookups
 * @param {Object} currentComponent
 * @param {String} name
 * @param {Object} reativeMap
 */
$ireactive.setReactiveMap = (currentComponent, name, reactiveMap) => {
	if (currentComponent._impressInternal.reactiveMaps.has(name) === false) {
		currentComponent._impressInternal.reactiveMaps.set(name, reactiveMap);
	}
	$ireactive.setReactiveLookup(currentComponent, reactiveMap.resolvedDataOwner, reactiveMap.resolvedPath, name);

	reactiveMap.reactiveSubMap.forEach((submap, key) => {
		//TODO need to set the resolved dataOwner and dataPath
		if (submap.dataPathArray[0] === 'props') {
			let propMap = $ireactive.getPropMap(currentComponent, reactiveMap.reactiveSubMap, submap.dataPathArray);

			$ireactive.setReactiveLookup(currentComponent, propMap.resolvedDataOwner, propMap.resolvedPath, reactiveMap.name);
		} else {
			$ireactive.setReactiveLookup(currentComponent, submap.dataOwner, submap.dataPath, reactiveMap.name);
		}
	});
};

/**
 * gets a data lookup map of a dataPath string
 * decodes nested paths into linear paths and constructs a submap chain
 * dictionay objects referenced by property keys in quotes ["name"] are not allowed
 * @param {Object} currentComponent
 * @param {String} str
 * @returns {Object}
 */
$ireactive.getReactiveMap = (currentComponent, str, iGuid, name = 'TEXT', targetMap = new Map([[iGuid, name]])) => {
	let reactiveSubMaps = new Map();
	let i = 0;
	let nestedDataStartIndexes = [];

	while (i++ < str.length) {
		if (str[i - 1] === '[') {
			if (str[i] === `"` || str[i] === `'`) ;
			else nestedDataStartIndexes.push(i);
		}
	}
	let dataOwner = currentComponent?._impressInternal?.iNode != undefined ? currentComponent : undefined;

	for (let i = nestedDataStartIndexes.length - 1; i >= 0; i--) {
		let startIndex = nestedDataStartIndexes[i];
		let endIndex = str.indexOf(']', startIndex);
		let dataPath = str.substring(startIndex, endIndex);
		let dataPathArray = dataPath.split('.');
		let numValue = Number(dataPath);
		let newGuid = isFinite(numValue) ? numValue : $ireactive.newGUID();
		let subdataOwner = dataOwner;
		let resolvedSubmapDataPathArray = dataPathArray;

		//reactivesubmap props are not substituted for their data parent but the data owner is - TODO IS THIS WRONG???
		//this would only occur here with drilled props as only drilled props would have a dataOwner
		//this method also converts array notation into dot notation e.g. data.array[0] becomes data.array.0
		//TODO how do we solve the props[data.val] issue with submaps??? and substituting the datapath/owner - resolvedDataPathArray???
		//if (dataPathArray[0] === 'data') value = $ireactive.getValueFromLookup(currentComponent, reactiveSubMaps, dataPathArray);
		if (dataPathArray[0] === 'props' && dataOwner != undefined) {
			let propMap = $ireactive.getPropMap(currentComponent, reactiveSubMaps, dataPathArray);

			resolvedSubmapDataPathArray = [...propMap.dataPathArray, ...dataPathArray.slice(2)];
			subdataOwner = propMap.dataOwner;
		}

		if (dataPathArray[0] === 'data' || dataPathArray[0] === 'props') {
			let submap = new REACTIVESUBMAP(dataPath, dataPathArray, dataOwner);
			submap.value = $ireactive.getValueFromLookup(subdataOwner, reactiveSubMaps, resolvedSubmapDataPathArray);
			reactiveSubMaps.set(newGuid, submap);
		}
		str = `${str.slice(0, startIndex - 1)}.${newGuid}${str.slice(endIndex + 1)}`;
	}

	//isResolvableValue is only true for a dataPath that contains no props - these are immediately resolvable
	let isResolvableValue = name.substring(0, 5) === 'props' || name === 'EVENTHANDLER' || (str.includes('[props') === false && str.indexOf('props') !== 0) ? true : false;
	//targetMap, dataPath, dataOwner, resolvedPath, reactiveSubMaps, value
	let reactiveMap = new REACTIVEMAP(targetMap, str, dataOwner, undefined, reactiveSubMaps, name);

	if (isResolvableValue === true) {
		//resolvable values starting "props" are drilled props
		if (reactiveMap.dataPathArray[0] === 'props') {
			let propMap = $ireactive.getPropMap(currentComponent, reactiveMap.reactiveSubMap, reactiveMap.dataPathArray);
			if (propMap != undefined) {
				let resolvedDataPathArray = $ireactive.getResolvedDataPathArray(propMap, reactiveMap);

				reactiveMap.resolvedDataOwner = propMap.resolvedDataOwner;
				reactiveMap.resolvedDataPathArray = resolvedDataPathArray;
				reactiveMap.resolvedPath = reactiveMap.resolvedDataPathArray.join('.');
				//all data submaps need to be passed on to all children of a reactive map

				propMap.reactiveSubMap.forEach((value, key) => {
					if (value.dataPathArray[0] === 'data') {
						reactiveMap.reactiveSubMap.set(key, value);
					}
				});
			} else {
				reactiveMap.resolvedDataOwner = undefined;
			}
		} else {
			let resolvedDataPathArray = $ireactive.getResolvedDataPathArray(reactiveMap);
			reactiveMap.resolvedDataPathArray = resolvedDataPathArray;
			reactiveMap.resolvedPath = reactiveMap.resolvedDataPathArray.join('.');
		}
	}
	return reactiveMap;
};

//OBSERVERS - REACTIVEMAPS

/**
 * Clones a reactive map
 * @param {Object} reactiveMap
 * @param {Object} currentComponent
 * @returns
 */
$ireactive.cloneReactiveMap = (reactiveMap, currentComponent) => {
	let reactiveSubMap = new Map();

	reactiveMap.reactiveSubMap.forEach((subMap, key) => {
		let newSubMap = new REACTIVESUBMAP(subMap.dataPath, subMap.dataPathArray.slice(), currentComponent);
		newSubMap.value = $ireactive.getValueFromLookup(newSubMap.dataOwner, reactiveMap.reactiveSubMap, newSubMap.dataPathArray);
		reactiveSubMap.set(key, newSubMap);
	});
	let clonedReactiveMap = new REACTIVEMAP(reactiveMap.targetMap, reactiveMap.dataPath, currentComponent, reactiveMap.resolvedPath, reactiveSubMap, reactiveMap.name);
	return clonedReactiveMap;
};

/**
 * a propMap created with getReactiveMap has the prop converted to the original data path
 * reactive maps here retain the prop based reactive lookup
 * rective maps here are reactive markup or custom observers
 * recursively finds parent when passThrough flag or super props is set
 * @param {Object} currentComponent
 * @param {Object} baseReactiveMap
 * @param {String} observerName
 */
$ireactive.getReactiveMapFromBaseMap = (currentComponent, baseReactiveMap = {}, observerName, dataOwner = currentComponent, isSlot = false) => {
	if (currentComponent._impressInternal.controlFlags.globalState?.has(observerName) === true) dataOwner = currentComponent._impressInternal.iRoot;
	let reactiveMap = $ireactive.cloneReactiveMap(baseReactiveMap, dataOwner);
	reactiveMap.name = observerName;
	//if reactiveMap is already set on the component just add the targets
	let reactiveMapName = isSlot === true ? `slot.${reactiveMap.name}` : reactiveMap.name;

	if (currentComponent._impressInternal.reactiveMaps.has(reactiveMapName) === true) {
		reactiveMap = currentComponent._impressInternal.reactiveMaps.get(reactiveMapName);
		baseReactiveMap.targetMap.forEach((value, key) => {
			reactiveMap.targetMap.set(key, value);
		});
	} else {
		if (reactiveMap.dataPathArray[0] === 'props') {
			//not dataOwner - currentComponent
			let propMap = $ireactive.getPropMap(dataOwner, reactiveMap.reactiveSubMap, reactiveMap.dataPathArray);

			if (propMap != undefined) {
				let resolvedDataPathArray = $ireactive.getResolvedDataPathArray(propMap, reactiveMap);
				reactiveMap.dataOwner = currentComponent;
				reactiveMap.resolvedDataPathArray = resolvedDataPathArray;
				reactiveMap.resolvedPath = resolvedDataPathArray.join('.');
				reactiveMap.resolvedDataOwner = propMap.resolvedDataOwner;

				//all data submaps need to be passed on to all children of a reactive map
				propMap.reactiveSubMap.forEach((value, key) => {
					if (value.dataPathArray[0] === 'data') {
						reactiveMap.reactiveSubMap.set(key, value);
					}
				});
				//TODO check for hasOwnData - check slot works
				//return reactiveMap;
			} else {
				reactiveMap.resolvedDataOwner = undefined;
			}
		}
	}
	//TODO data needs passing back through passThroughs
	//let isSuperProp = currentComponent._impressInternal.controlFlags.superProps?.has(observerName) && dataOwner?._impressInternal?.iParent != undefined;
	let isPassThrough = dataOwner?._impressInternal.controlFlags.isPassThrough === true ? true : false;
	//console.log(reactiveMap);
	if ($ireactive.isComponentHasOwnData(reactiveMap, currentComponent._impressInternal.keys)) {
		return reactiveMap;
	} else if (isPassThrough !== true) {
		// && isSuperProp !== true) {
		$idebug.error('getReactiveMapFromBaseMap', currentComponent, observerName);
	} else {
		return $ireactive.getReactiveMapFromBaseMap(currentComponent, baseReactiveMap, observerName, dataOwner._impressInternal.iParent, isSlot);
	}
};

//DATA SETTING//////////////////////////////////////////////////////////////////

/**
 * sets a value to a dataOwner object
 * @param {Object} dataOwner
 * @param {Array} path
 * @param {*} value
 */
$ireactive.setDataFromPath = (dataOwner, pathArray, value) => {
	let dataPathArray = pathArray.slice();
	let lastPath = dataPathArray.pop();
	//let dataObject = dataPathArray.reduce((acc, cur) => (acc = acc?.[cur]), dataOwner);
	let dataObject = $ireactive.getValueFromLookup(dataOwner, undefined, dataPathArray);

	if (dataObject != undefined) dataObject[lastPath] = value;
};

/**
 * gets a value from a pathArray and dataOwner object
 * @param {Object} dataOwner
 * @param {String} path
 * @param {*} value
 */
$ireactive.getDataFromPath = (dataOwner, pathArray, keys) => {
	return $ireactive.getValueFromLookup(dataOwner, undefined, pathArray, keys);
};

/**
 * sets custom observers -TODO
 * @param {Object} observers
 * @param {Object} reactiveMaps
 */
$ireactive.setCustomObserverReactiveMaps = (observers, iReactive) => {
	let data = { data: undefined };

	if (observers != undefined && typeof observers === 'object') {
		observers.forEach((observerValue, observerKey) => {
			if (iReactive.has(observerKey) === true) {
				let reactiveMap = iReactive.get(observerKey);
				reactiveMap.targetMap.set($ireactive.newGUID(), 'OBSERVER');
			} else {
				let reactiveMap = $ireactive.getReactiveMap(data, observerKey, $ireactive.newGUID(), 'OBSERVER');
				iReactive.set(observerKey, reactiveMap);
			}
		});
	}
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class REACTIVEMAP {
	constructor(targetMap, dataPath, dataOwner, resolvedPath, reactiveSubMap, name) {
		this.targetMap = targetMap;
		this.dataPath = dataPath;
		this.dataPathArray = typeof dataPath === 'string' ? dataPath.split('.') : undefined;
		this.dataOwner = dataOwner;
		this.resolvedDataOwner = dataOwner;
		this.resolvedDataPathArray = this.dataPathArray;
		this.resolvedPath = resolvedPath;
		this.reactiveSubMap = reactiveSubMap;
		this.name = typeof name === 'string' && (name.substring(0, 4) === 'data' || name.substring(0, 5) === 'props') ? name : null;
	}
}

class REACTIVESUBMAP {
	constructor(dataPath, dataPathArray, dataOwner, value) {
		this.dataPath = dataPath;
		this.dataPathArray = dataPathArray;
		this.dataOwner = dataOwner;
		this.value = value;
	}
}

/**
 * template parsing methods for impress
 *
 * @format
 */

//PUBLIC
const $itemplate = {};

//PRIVATE
const _itemplate = {};

//IMPLEMENTATION
/**
 * sets the iObject._ievents Maps
 * @param {Object} iObject
 * @param {Array} attributeArray
 */
_itemplate.setTemplateAttributeMaps = (attributeArray, iGuid, iReactive, iEvents) => {
	for (let attr of attributeArray) {
		let [name, value] = attr.split('=');
		if (value[0] === `"`) value = value.substring(1, value.length - 1);
		value = value.replaceAll('&quot;', `"`);
		//handle events and data attribuets separately
		if (name === 'i-event') {
			value = JSON.parse(value);

			let entries = Object.entries(value);
			if (iEvents.has(iGuid) === false) iEvents.set(iGuid, new Map());
			let eventMap = iEvents.get(iGuid);

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
			let pseudoComponent = { data: undefined }; //{ data: iObject.data };

			if (iReactive.has(dataPath) === true) {
				let reactiveMap = iReactive.get(dataPath);
				reactiveMap.targetMap.set(iGuid, name);
			} else {
				let reactiveMap = $ireactive.getReactiveMap(pseudoComponent, dataPath, iGuid, name);
				iReactive.set(dataPath, reactiveMap);
			}
		}
	}
};

/**
 * wraps the template text in a span
 */
_itemplate.wrapInSpan = (match, iReactive) => {
	let _iGuid = $ireactive.newGUID();
	let dataPath = match.substring(1, match.length - 1);
	let reactiveMap;

	if (iReactive.has(dataPath) === true) {
		reactiveMap = iReactive.get(dataPath);
		reactiveMap.targetMap.set(_iGuid, 'TEXT');
	} else {
		reactiveMap = $ireactive.getReactiveMap({ data: undefined }, dataPath, _iGuid, 'TEXT');
		iReactive.set(dataPath, reactiveMap);
	}

	//if a path is resolvable it contains no props references and can be substituted into the template markup
	return `<span i-data="${_iGuid}">${match}</span>`;
};

/**
 * create a dynamic style reactive map
 */
_itemplate.createDynamicStyle = (match, iReactive) => {
	let _iGuid = $ireactive.newGUID();
	let dataPath = match.substring(1, match.length - 1);
	let reactiveMap;

	if (iReactive.has(dataPath) === true) {
		reactiveMap = iReactive.get(dataPath);
		reactiveMap.targetMap.set(_iGuid, 'STYLE');
	} else {
		reactiveMap = $ireactive.getReactiveMap({ data: undefined }, dataPath, _iGuid, 'STYLE');
		iReactive.set(dataPath, reactiveMap);
	}
	return `/*${_iGuid}*//*${_iGuid}*/`;
};

//PUBLIC

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
$itemplate.iAttributesHtml = function (template, iReactive = new Map(), iEvents = new Map()) {
	let tempLines;
	let skipComponentCount = 0;
	let skipCommentCount = 0;

	const isComponent = function (tagLine, skipCount) {
		if (tagLine[0] === '<') {
			let tagName = tagLine.match(/<[\s/]*[^\s>]+/)?.[0];
			if (tagName != undefined) {
				tagName = tagName.replace('/', '');
				tagName = tagName.replace('<', '');
				tagName = tagName.trim();

				if (impressObjects.has(tagName) === true) {
					if (tagLine.substring(0, 2) === `</`) skipCount--;
					else skipCount++;
				}
			}
		}
		return skipCount;
	};

	tempLines = template.match(/(<[^>]+)>|[^<]+|-->/g);
	if (tempLines != undefined) {
		for (let i = 0, tLen = tempLines.length; i < tLen; i++) {
			let v = tempLines[i];

			//skip commments
			if (v.substring(0, 4) === '<!--') skipCommentCount++;
			else if (v.substring(v.length - 3) === '-->' && skipCommentCount > 0) skipCommentCount--;

			if (skipCommentCount > 0) continue;

			//skip child component content
			skipComponentCount = isComponent(v, skipComponentCount);

			if (skipComponentCount > 0) {
				if (v.substring(v.length - 2) === '/>') skipCommentCount--;
				continue;
			}

			if (v[0] === '<') {
				//identify tags with attributes containing data/props/i-events

				if (v.includes('{props') || v.includes('{data') || v.includes('i-event')) {
					let tag = v.match(/<[^\s]+/);
					tag = tag[0].slice(1);

					//test tagline for attribute match, get new GUID if present, remove attributes from tagline
					let attr = v.match(/[a-z-]+={[^}]+}|[a-z-]+="{[^}]+}"/g);

					if (attr != undefined && !impressObjects.get(tag)) {
						let _iGuid = $ireactive.newGUID();
						let vAttrIndex = 0;
						let vAttrLength = attr.length;

						_itemplate.setTemplateAttributeMaps(attr, _iGuid, iReactive, iEvents);

						while (vAttrIndex < vAttrLength) {
							//replace the attribute in the markup with a reference
							if (vAttrIndex === 0) tempLines[i] = tempLines[i].replace(attr[vAttrIndex], `i-attribute="${_iGuid}"`);
							else tempLines[i] = tempLines[i].replace(attr[vAttrIndex], '');
							vAttrIndex++;
						}
					}
				}
			} else if (v.includes('{props') || v.includes('{data')) {
				//tag content - i.e. textline wrap in span
				if (tempLines[i - 1]?.substring(0, 6) === '<style') {
					tempLines[i] = tempLines[i].replace(/[\t\n]/g, '').trim();
					tempLines[i] = tempLines[i].replace(/{data[^}]+}|{props[^}]+}/g, (match) => _itemplate.createDynamicStyle(match, iReactive));
				} else {
					tempLines[i] = tempLines[i].replace(/{data[^}]+}|{props[^}]+}/g, (match) => _itemplate.wrapInSpan(match, iReactive));
				}
			}
		}
		template = tempLines.reduce((t, c) => (t += c));
	}
	return template;
};

/**
 * Removes newline/return and extraneous spaces, including trimming spaces from datamatches
 * @param {String} template
 * @returns
 */
$itemplate.correctHtml = function (template) {
	if (typeof template === 'string') {
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
 * iMpress high speed framework for HTML Custom Elements
 * Copyright (c) 2019, Polymathic Design, M J Livesey, All rights reserved.
 *
 * @format
 */

//PRIVATE
const _iRegister = new Map();
const _impress = {};

/**
 * internal IMPRESS object class
 */
class IMPRESSINTERNAL {
	constructor(baseInstance) {
		this.name = baseInstance.name;
		this._ireactive = new Map();
		this._ievents = new Map();
		if (typeof baseInstance.template !== 'function') {
			this.template = baseInstance.template;

			if (this.template != undefined && this.template !== '') {
				this.template = $itemplate.correctHtml(this.template);
				this.template = $itemplate.iAttributesHtml(this.template, this._ireactive, this._ievents);
			} else {
				this.template = '';
			}
			this.templateNode = document.createElement('template');
			this.templateNode.innerHTML = this.template;
		} else {
			this.templateNode = undefined;
			this.template = undefined;
		}

		$ireactive.setCustomObserverReactiveMaps(baseInstance._impressInternal.iObservers, this._ireactive);

		//HTML CUSTOM ELEMENT
		impressObjects.set(this.name, this);
		//Callbacks to define HTML custom Element
		customElements.define(
			this.name,
			class extends HTMLElement {
				constructor() {
					super();
				}
				//Callback when components gets added to the DOM - "connected"
				connectedCallback() {
					_impress.connectComponent(this);
				}
				//Callback when components gets moved/removed from the DOM - "disconnected"
				disconnectedCallback() {
					_impress.disconnectComponent(this);
				}
			}
		);
	}
}

//PUBLIC
/**
 * extended IMPRESS component class
 */
class IMPRESS {
	#template;
	constructor(iNode) {
		this.props = {};
		this.data = {};
		this._impressInternal = {};

		//class has been registered this is a call from connectComponent passing in the connected node
		if (iNode !== undefined) {
			let name = iNode.localName;

			//PRIVATE
			let iParent = _impress.findParentComponentByNode(iNode);
			let iRoot = iParent == undefined ? this : iParent._impressInternal.iRoot;
			this._impressInternal = {
				name: name,
				iGuid: $ireactive.newGUID(),
				isConnected: false,
				isMounted: false,
				iEventAbort: new AbortController(),
				reactiveLookupMaps: new Map(),
				reactiveMaps: new Map(),
				iNode: iNode,
				iParent: iParent,
				iRoot: iRoot,
				iChildren: new Set(),
				iReactive: null,
				iEvents: null,
				iSlotReactive: null,
				iSlotEvents: null,
				iObservers: new Map(),
				template: undefined,
				templateNode: null,
				createKey: undefined,
				keys: [],
				controlFlags: {}
			};
			//each component takes the entire array of its parent keys to enable it to decode the data key "?" chain
			if (Array.isArray(iParent?._impressInternal.keys) === true) this._impressInternal.keys.push(...iParent._impressInternal.keys);
			if (iParent?._impressInternal.createKey != undefined) {
				this._impressInternal.keys.push(iParent._impressInternal.createKey);
				this._impressInternal.controlFlags.isSkipRefresh = true;
			}
			this._impressInternal.iNode.setAttribute('i-guid', this._impressInternal.iGuid);
			impressComponents.set(this._impressInternal.iGuid, this);
		}
	}
	//static method register can be called once from the component module
	static register(impressClass) {
		const baseInstance = new impressClass();

		if (baseInstance instanceof IMPRESS) {
			baseInstance.name = typeof baseInstance.name == 'string' ? baseInstance.name.toLowerCase() : undefined;
			if (baseInstance.name == undefined || impressObjects.get(baseInstance.name) != undefined) throw new Error(`iMpress error --- ${baseInstance.name} is invalid --- components must have a name property that is unique`);

			_iRegister.set(baseInstance.name, impressClass);

			new IMPRESSINTERNAL(baseInstance);

			return true;
		} else {
			throw new Error(`iMpress error --- ${baseInstance.name} invalid class --- class must extend an instance of IMPRESS`);
		}
	}
	get template() {
		return this.#template;
	}
	set template(value) {
		if (typeof value === 'string') {
			if (value !== this.#template) {
				if (this._impressInternal.isConnected !== true) {
					this.#template = value;
				} else {
					_impress.clearReactivity(this);
					this.#template = value;
					this.#template = $itemplate.correctHtml(this.#template);
					this.#template = $itemplate.iAttributesHtml(this.#template, this._impressInternal.iReactive, this._impressInternal.iEvents);
					this._impressInternal.templateNode = document.createElement('template');
					this._impressInternal.templateNode.innerHTML = this.#template;
					this._impressInternal.templateNode = this._impressInternal.templateNode.content;
					if (this._impressInternal.isMounted === true) {
						this._impressInternal.isMounted = false;
						_impress.createComponent(this);
					}
				}
			}
		} else {
			$idebug.error('templateType', this);
		}
	}
	iDefine(definition, ...args) {
		//if (this._impressInternal ==
		if (this._impressInternal.controlFlags == undefined) this._impressInternal.controlFlags = {};
		switch (definition) {
			case 'superProps':
				if (typeof args[0] === 'string') {
					if (Array.isArray(this._impressInternal.controlFlags[definition]) === false) this._impressInternal.controlFlags[definition] = new Set();
					for (let arg of args) {
						this._impressInternal.controlFlags[definition].add(arg);
					}
				}
				break;
			case 'globalState':
				if (typeof args[0] === 'string') {
					if (Array.isArray(this._impressInternal.controlFlags[definition]) === false) this._impressInternal.controlFlags[definition] = new Set();
					for (let arg of args) {
						this._impressInternal.controlFlags[definition].add(arg);
					}
				}
				break;
			case 'isPassThrough':
			case 'isShadowDOM':
				this._impressInternal.controlFlags[definition] = args[0] === true;
				break;
			case 'observer':
				if (this._impressInternal.iObservers == undefined) this._impressInternal.iObservers = new Map();
				this._impressInternal.iObservers.set(args[0], args[1]);
				break;
			case 'isDebug':
				if (this._impressInternal.iRoot === this && typeof args[0] === 'boolean') {
					this._impressInternal.controlFlags[definition] = args[0];
					$idebug.setGlobalMethod(args[0]);
				}
				break;
		}
	}
	iSetTemplate(value) {
		if (typeof value === 'string') {
			if (value !== this.template) {
				if (this._impressInternal.isConnected !== true) {
					this.template = value;
				} else {
					_impress.clearReactivity(this);
					this.template = value;
					this.template = $itemplate.correctHtml(this.template);
					this.template = $itemplate.iAttributesHtml(this.template, this._impressInternal.iReactive, this._impressInternal.iEvents);
					this._impressInternal.templateNode = document.createElement('template');
					this._impressInternal.templateNode.innerHTML = this.template;
					this._impressInternal.templateNode = this._impressInternal.templateNode.content;
					if (this._impressInternal.isMounted === true) {
						this._impressInternal.isMounted = false;
						_impress.createComponent(this);
					}
				}
			}
		} else {
			$idebug.error('templateType', this);
		}
	}
	iSetState(data, ...value) {
		_impress.setState(this, data, value);
	}
	iGetState(data) {
		return _impress.getState(this, data);
	}
	iDestroy() {
		let iNode = this._impressInternal.iNode.host ?? this._impressInternal.iNode;
		if (iNode?.parentNode != undefined) iNode.parentNode.removeChild(iNode);
		//TODO destroy in data only
	}
	iClosest(query) {
		return _impress.iClosest(this, query);
	}
	iQuerySelector(query) {
		return _impress.iQuerySelector(this, query);
	}
	iQuerySelectorAll(query) {
		return _impress.iQuerySelectorAll(this, query);
	}
	iGetComponentByNode(targetNode) {
		return _impress.getComponentByNode(targetNode);
	}
	iGetComponentById(iGuid) {
		return _impress.getComponentById(iGuid);
	}
	iGetComponentsByName(name) {
		return _impress.getComponentsByName(name);
	}
	iWait() {
		return new Promise((resolve) => setTimeout(() => resolve(), time));
	}
}

//IMPLEMENTATION
//PRIVATE

//CONSTRUCTOR METHODS

_impress.connectComponent = (thisNode) => {
	if (thisNode.isConnected === false) return;
	let iGuid = thisNode.getAttribute('i-guid');
	let currentComponent = impressComponents.get(iGuid);

	//create component on first connection only
	if (currentComponent == undefined) {
		const REGISTEREDIMPRESSCLASS = _iRegister.get(thisNode.localName) ?? IMPRESS; //TODO throw error here
		let currentComponent = new REGISTEREDIMPRESSCLASS(thisNode);

		if (currentComponent._impressInternal.iParent != undefined) {
			currentComponent._impressInternal.iParent._impressInternal.iChildren.add(currentComponent);
			if (currentComponent._impressInternal.iParent._impressInternal.isMounted === true) _impress.createComponent(currentComponent);
		} else {
			_impress.createComponent(currentComponent);
		}
	} else if (thisNode !== currentComponent._impressInternal.iNode) {
		thisNode.removeAttribute('i-guid');
		_impress.connectComponent(thisNode);
	}
};

/**
 * clears the reactivity
 * @param {Object} currentComponent
 */
_impress.clearReactivity = (currentComponent) => {
	currentComponent._impressInternal.iReactive = new Map();
	currentComponent._impressInternal.iEvents = new Map();
	currentComponent._impressInternal.iObservers.clear();
	currentComponent._impressInternal.reactiveLookupMaps.clear();
	currentComponent._impressInternal.reactiveMaps.clear();
	currentComponent._impressInternal.iEventAbort = new AbortController();
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
	currentComponent._impressInternal.isConnected = true;

	_impress.setiPropsMaps(currentComponent);

	if (typeof currentComponent.beforeCreate === 'function') await currentComponent.beforeCreate(currentComponent);
	//let iGuidTemplate = iObject.template.replace(/i-attribute="/g, `i-attribute="${currentComponent.iGuid}-`);

	//template component
	if (currentComponent._impressInternal.iReactive == undefined) currentComponent._impressInternal.iReactive = iObject._ireactive;
	if (currentComponent._impressInternal.iEvents == undefined) currentComponent._impressInternal.iEvents = iObject._ievents;
	if (currentComponent._impressInternal.templateNode == undefined) currentComponent._impressInternal.templateNode = iObject.templateNode.content.cloneNode(true);

	//mount the component HTML
	if (currentComponent._impressInternal.controlFlags.isShadowDOM === false) {
		//standard DOM
		currentComponent._impressInternal.iNode.innerHTML = '';
		if (currentComponent.template !== '') {
			currentComponent._impressInternal.iNode.appendChild(currentComponent._impressInternal.templateNode);
		}
	} else {
		//shadowDOM
		//Set any slot reactivity
		if (currentComponent._impressInternal.iNode.childNodes.length > 0) {
			let slotTemplate = currentComponent._impressInternal.iNode.innerHTML;

			currentComponent._impressInternal.iSlotReactive = new Map();
			currentComponent._impressInternal.iSlotEvents = new Map();
			slotTemplate = $itemplate.iAttributesHtml(slotTemplate, currentComponent._impressInternal.iSlotReactive, currentComponent._impressInternal.iSlotEvents);
			currentComponent._impressInternal.iNode.innerHTML = slotTemplate;
		}
		const shadowRoot = currentComponent._impressInternal.iNode.host ? currentComponent._impressInternal.iNode : currentComponent._impressInternal.iNode.attachShadow({ mode: 'open' });
		if (shadowRoot.childNodes.length > 0) shadowRoot.innerHTML = '';
		shadowRoot.appendChild(currentComponent._impressInternal.templateNode);
		currentComponent._impressInternal.iNode = shadowRoot;
	}

	_impress.setiReactiveMaps(currentComponent);
	if (currentComponent.name !== 'i-for' && currentComponent.name !== 'i-if') {
		_impress.setiEventMaps(currentComponent, undefined, currentComponent._impressInternal.iSlotEvents);
		_impress.setiEventMaps(currentComponent, undefined, currentComponent._impressInternal.iEvents);
	}

	currentComponent._impressInternal.iChildren.forEach((child) => {
		_impress.createComponent(child);
	});

	//component has mounted
	currentComponent._impressInternal.isMounted = true;
	if (typeof currentComponent.afterMount === 'function') await currentComponent.afterMount(currentComponent);
};

/**
 * finds a parent component by Node search
 * @param {Object} thisNode
 * @returns
 */
_impress.findParentComponentByNode = function (thisNode) {
	let parentNode = thisNode.parentNode.host != undefined ? thisNode.parentNode.host : thisNode.parentNode;
	let parentName = parentNode.localName;

	while (parentNode.localName !== 'body' && impressObjects.get(parentName) == undefined) {
		parentNode = parentNode.parentNode.host != undefined ? parentNode.parentNode.host : parentNode.parentNode;
		parentName = parentNode.localName;
	}

	if (parentName !== 'body') {
		return _impress.getComponentByNode(parentNode);
	} else {
		return undefined;
	}
};

////////////////////////////////////////////////////////////////////////////////
//DESTRUCTOR METHODS

_impress.disconnectComponent = async (thisNode) => {
	//appended nodes are still connected - do not destroy them
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
	if (currentComponent._impressInternal.iChildren.size === 0) {
		_impress.destroyComponent(currentComponent);
	} else {
		//TODO we can loop the children backwards???
		currentComponent._impressInternal.iChildren.forEach((child) => {
			_impress.destroyComponent(child);
		});
		_impress.destroyComponent(currentComponent);
	}
};

_impress.destroyComponent = async (currentComponent) => {
	if (typeof currentComponent.beforeDestroy === 'function') await currentComponent.beforeDestroy(currentComponent);
	//remove iChildren references in parent
	if (currentComponent._impressInternal.iParent != undefined) {
		if (currentComponent._impressInternal.iParent._impressInternal.iChildren.has(currentComponent) === true) {
			currentComponent._impressInternal.iParent._impressInternal.iChildren.delete(currentComponent);
		}
	}
	//remove all event listeners
	currentComponent._impressInternal.iEventAbort.abort();

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
/*_impress.getTextNodes = (currentComponent) => {
	let iTextNodes = [];
	let treeWalker = document.createNodeIterator(currentComponent._impressInternal.iNode, NodeFilter.SHOW_TEXT, (node) => {
		return node.nodeValue.includes('{data.') || node.nodeValue.includes('{props.') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
	});
	let n;
	while ((n = treeWalker.nextNode())) {
		iTextNodes.push(n);
	}
	return iTextNodes;
};*/

//PROPS

/**
 * TODOcreateDataObserver
 * Maps props to data and sets observers on the dataOwner
 * @param {Object} currentComponent
 */
_impress.setiPropsMaps = (currentComponent) => {
	let iNode = currentComponent._impressInternal.iNode.host != undefined ? currentComponent._impressInternal.iNode.host : currentComponent._impressInternal.iNode;

	if (currentComponent._impressInternal.iParent != undefined) {
		let attributes = iNode.attributes;

		for (let attribute of attributes) {
			if (attribute.value.substring(0, 5) === '{data' || attribute.value.substring(0, 6) === '{props') {
				//below reducer converts kebab case into camelCase
				let attributeName = Array.prototype.reduce.call(attribute.name, (a, c) => (a[a.length - 1] === '-' ? a.substring(0, a.length - 1) + c.toUpperCase() : a + c), '');
				let parentComponent = currentComponent._impressInternal.iParent;
				let dataPath = attribute.value.substring(1, attribute.value.length - 1);
				let propName = 'props.' + attributeName;
				let dataOwner = currentComponent._impressInternal.controlFlags.globalState?.has(propName) === true ? currentComponent._impressInternal.iRoot : parentComponent;
				let propMap;

				//optimization for i-for cachedMaps
				if (parentComponent.data.cachedMaps == undefined || parentComponent.data.cachedMaps.get(propName) == undefined) {
					propMap = $ireactive.getReactiveMap(dataOwner, dataPath, $ireactive.newGUID(), propName);
				} else {
					propMap = parentComponent.data.cachedMaps.get(propName);
				}

				if (propMap != undefined) {
					//below will error if data does not exist???
					let isParentPropOwner = $ireactive.isComponentHasOwnData(propMap, currentComponent._impressInternal.keys);

					if (isParentPropOwner === false) {
						let isSuperProp = currentComponent._impressInternal.controlFlags.superProps?.has(propName);
						let isPassThrough = parentComponent?._impressInternal.controlFlags.isPassThrough ?? false;
						//TODO acceptSuperProps
						while (isParentPropOwner === false && (isPassThrough === true || isSuperProp === true)) {
							parentComponent = parentComponent._impressInternal.iParent;
							//TODO need a method to change dataOwners and refresh propMap
							propMap = $ireactive.getReactiveMap(parentComponent, dataPath, $ireactive.newGUID(), propName);
							isParentPropOwner = $ireactive.isComponentHasOwnData(propMap, currentComponent._impressInternal.keys);
							isPassThrough = parentComponent?._impressInternal.controlFlags.isPassThrough ?? false;
						}
						if (isParentPropOwner !== true) $idebug.error('setiPropsMaps', currentComponent, propName, dataPath);
					}
					$ireactive.setReactiveMap(currentComponent, propName, propMap, false);
					let value = $ireactive.getValueFromLookup(propMap.resolvedDataOwner, propMap.reactiveSubMap, propMap.resolvedDataPathArray, currentComponent._impressInternal.keys);

					currentComponent.props[attributeName] = value;
					if (currentComponent._impressInternal.iParent._impressInternal.name === 'i-for') currentComponent._impressInternal.iParent.data.cachedMaps.set(propName, propMap);
				}
			}
			//iNode.removeAttribute(attribute.name);
		}
	}
};

//REACTIVE DATA & PROPS

/**
 * Set the reactiveMaps for the component that will reactively update the DOM
 * reactiveMaps can be set to the slot or shadowDOM of the component
 * slotted reactiveMaps take their data from different parent sources
 * @param {Object} currentComponent
 */
_impress.setiReactiveMaps = (currentComponent) => {
	//set component reactiveMaps taken from the innerHTML (slots and i-for/i-if)
	if (currentComponent._impressInternal.iSlotReactive != undefined) {
		let isSlot = currentComponent._impressInternal.iNode.host != undefined;
		let node = isSlot === true ? currentComponent._impressInternal.iNode.host : currentComponent._impressInternal.iNode;

		currentComponent._impressInternal.iSlotReactive.forEach((baseReactiveMap, key) => {
			let reactiveMap = $ireactive.getReactiveMapFromBaseMap(currentComponent, baseReactiveMap, key, currentComponent._impressInternal.iParent, isSlot);

			if (reactiveMap != undefined) {
				let reactiveMapName = isSlot === true ? `slot.${reactiveMap.name}` : reactiveMap.name;
				$ireactive.setReactiveMap(currentComponent, reactiveMapName, reactiveMap);

				//console.log(isSlot, reactiveMapName, baseReactiveMap, reactiveMap);
				if (typeof currentComponent.iRender !== 'function') {
					$ireactive.setReactiveDataToDOM(currentComponent, node, reactiveMap, true, currentComponent._impressInternal.keys);
				}
			}
		});
	}
	//set class reactiveMaps taken from the template file
	currentComponent._impressInternal.iReactive.forEach((baseReactiveMap, key) => {
		let reactiveMap = $ireactive.getReactiveMapFromBaseMap(currentComponent, baseReactiveMap, key);

		if (reactiveMap != undefined) {
			$ireactive.setReactiveMap(currentComponent, reactiveMap.name, reactiveMap);
			if (currentComponent.name !== 'i-for' && currentComponent.name !== 'i-if') {
				$ireactive.setReactiveDataToDOM(currentComponent, currentComponent._impressInternal.iNode, reactiveMap, true, currentComponent._impressInternal.keys);
			}
		}
	});
};

////////////////////////////////////////////////////////////////////////////////
//IEVENTS//

/**
 * loops through the iEventMap and registers the eveng listeners for the component
 * TODO add ifor capability, template and ifor Abort controller?
 * @param {Object} currentComponent
 * @param {Object} template [optional] defaults to the currentCompnent node
 */
_impress.setiEventMaps = function (currentComponent, customTemplate, iEvents) {
	if (iEvents != undefined) {
		iEvents.forEach((eventMap, iGuid) => {
			let eventNode;

			if (customTemplate == undefined) eventNode = currentComponent._impressInternal.iNode.querySelector(`[i-attribute="${iGuid}"]`);
			else eventNode = customTemplate.querySelector(`[i-attribute="${iGuid}"]`);

			eventMap.forEach((iEventArray, listener) => {
				for (let iEvent of iEventArray) {
					let fn = iEvent[0];
					let args = iEvent.slice(1);
					let methodSource = currentComponent;

					while (methodSource != undefined && typeof methodSource[fn] !== 'function' && methodSource._impressInternal.controlFlags.isPassThrough === true) {
						methodSource = methodSource._impressInternal.iParent;
					}

					if (typeof methodSource[fn] == 'function') {
						let options = { signal: currentComponent._impressInternal.iEventAbort.signal };

						eventNode.addEventListener(
							listener,
							(e) => {
								let argsToData = [];

								for (let i = 0, v; (v = args[i]) !== undefined; i++) {
									if (v === '$e' || v === '$event') {
										v = e;
									} else if (parseFloat(v) === Number(v)) {
										v = parseFloat(v);
									} else if (v === 'true') {
										v = true;										
									} else if (v === 'false') {
										v = false;
									} else if (v.substring(0, 5) === 'data.' || v.substring(0, 6) === 'props.') {
										let path = v.match(/[^\[\]\.\{\}]+/g);
										let dataSource = methodSource;

										if (path[0] === 'props') {
											let propMap = $ireactive.getPropMap(dataSource, undefined, path);
											let resolvedDataPathArray = [...propMap.resolvedDataPathArray, ...path.slice(2)];
											v = $ireactive.getDataFromPath(propMap.resolvedDataOwner, resolvedDataPathArray);
										} else {
											v = $ireactive.getDataFromPath(dataSource, path);
										}
									}
									argsToData.push(v);
								}
								methodSource[fn](...argsToData);
							},
							options
						);
					} else {
						$idebug.error('setiEventMaps', methodSource, listener, fn);
					}
				}
			});
		});
	}
};

////////////////////////////////////////////////////////////////////////////////
//PROTOTYPE METHODS//
//SETSTATE, GETSTATE, QUERY METHODS

/**
 * @private
 * @description
 * Sets data or props state
 * props are mapped to data owner
 * @param {Object} currentComponent
 * @param {String || Array} path
 */
_impress.setState = (currentComponent, path, value) => {
	if (typeof path === 'string') path = path.match(/[^\[\]\.\{\}]+/g);
	if (path[0] === 'props') {
		//TODO need a method to completely resolve a data path including keys
		let { resolvedDataPathArray, resolvedDataOwner } = $ireactive.getResolvedDataPathArrayWithResolvedKeys(currentComponent, undefined, path);

		if (value.length > 0) $ireactive.setDataFromPath(resolvedDataOwner, resolvedDataPathArray, value[0]);
		if (currentComponent._impressInternal.iRoot._impressInternal.controlFlags.isDebug === true) {
			$idebug.setStateChangeLog(currentComponent, path, resolvedDataOwner, resolvedDataPathArray);
		}
		$ireactive.updateAllChildren(resolvedDataOwner, resolvedDataPathArray);
	} else if (path[0] === 'data') {
		if (value.length > 0) $ireactive.setDataFromPath(currentComponent, path, value[0]);
		if (currentComponent._impressInternal.iRoot._impressInternal.controlFlags.isDebug === true) {
			$idebug.setStateChangeLog(currentComponent, path, currentComponent, path);
		}
		$ireactive.updateAllChildren(currentComponent, path);
	}
};

/**
 * @private
 * @description
 * Sets data or props state
 * props are mapped to data owner
 * @param {Object} currentComponent
 * @param {String || Array} path
 */
_impress.getState = (currentComponent, path) => {
	if (typeof path === 'string') path = path.match(/[^\[\]\.\{\}]+/g);
	else path = path.slice();

	if (path[0] === 'props') {
		let { resolvedDataPathArray, resolvedDataOwner } = $ireactive.getResolvedDataPathArrayWithResolvedKeys(currentComponent, undefined, path);
		let stateChangeLog = $idebug.getStateChangeLog(resolvedDataOwner, resolvedDataPathArray);

		return { dataOwner: resolvedDataOwner._impressInternal.name, dataPath: resolvedDataPathArray, value: $ireactive.getDataFromPath(resolvedDataOwner, resolvedDataPathArray), stateChangeLog: stateChangeLog };
	} else if (path[0] === 'data') {
		let stateChangeLog = $idebug.getStateChangeLog(currentComponent, path);
		return { dataOwner: currentComponent._impressInternal.name, dataPath: path, value: $ireactive.getDataFromPath(currentComponent, path), stateChangeLog: stateChangeLog };
	}
};

/**
 *
 * @param {Object} queryObject
 * @param {*} value
 * @param {Boolean} result
 * @returns
 */
_impress.queryObjectMatch = (queryObject, value, result) => {
	if (Object.hasOwn(queryObject, 'value') === false && Object.hasOwn(queryObject, 'notValue') === false) {
		if (value == undefined) result = undefined;
	} else if (Object.hasOwn(queryObject, 'value') === true) {
		if (value !== queryObject.value) result = undefined;
	} else if (Object.hasOwn(queryObject, 'notValue') === true) {
		if (value === queryObject.notValue) result = undefined;
	}
	return result;
};

/**
 *
 * @param {Object} component
 * @param {Object} qData
 * @param {Object} qProps
 * @param {Object} qNames
 * @param {Object} qMethods
 * @returns
 */
_impress.isQueryMatch = (component, qData, qProps, qNames, qMethods) => {
	let result = component;

	if (qData != undefined) {
		for (let i = 0; i < qData.length; i++) {
			let value = $ireactive.getDataFromPath(component, qData[i].path);
			result = _impress.queryObjectMatch(qData[i], value, result);
			if (result == undefined) break;
		}
	}
	if (qProps != undefined) {
		for (let i = 0; i < qProps.length; i++) {
			let value = $ireactive.getDataFromPath(component, qProps[i].path);
			result = _impress.queryObjectMatch(qProps[i], value, result);
			if (result == undefined) break;
		}
	}
	if (qNames != undefined) {
		if (qNames.includes(component._impressInternal.name) === false) result = undefined;
	}
	if (qMethods != undefined) {
		for (let i = 0; i < qMethods.length; i++) {
			if (typeof component[qMethods[i]] !== 'function') {
				result = undefined;
				break;
			}
		}
	}
	return result;
};

/**
 *
 * @param {Object} component
 * @param {Object} query
 */
_impress.iQuerySelector = (component, query) => {
	let qData = Array.isArray(query.data) || query.data == undefined ? query.data : [query.data]; // {path: ['data', 'bar'], value: 'foo'}
	let qMethods = Array.isArray(query.methods) || query.methods == undefined ? query.methods : [query.methods];
	let qNames = Array.isArray(query.name) || query.name == undefined ? query.name : [query.name];
	let qProps = Array.isArray(query.props) || query.props == undefined ? query.props : [query.props]; // {path: ['data', 'bar'], value: 'foo'}

	let result = undefined;
	let childrenArray = [component._impressInternal.iChildren];

	for (let i = 0; i < childrenArray.length; i++) {
		let children = childrenArray[i];

		for (let child of children) {
			result = _impress.isQueryMatch(child, qData, qMethods, qNames, qProps);
			if (result != undefined) break;
			if (child._impressInternal.iChildren.size > 0) childrenArray.push(child._impressInternal.iChildren);
		}
		if (result != undefined) break;
	}
	return result;
};

/**
 *
 * @param {Object} component
 * @param {Object} query
 */
_impress.iQuerySelectorAll = (component, query) => {
	let qData = Array.isArray(query.data) || query.data == undefined ? query.data : [query.data]; // {path: ['data', 'bar'], value: 'foo'}
	let qMethods = Array.isArray(query.methods) || query.methods == undefined ? query.methods : [query.methods];
	let qNames = Array.isArray(query.name) || query.name == undefined ? query.name : [query.name];
	let qProps = Array.isArray(query.props) || query.props == undefined ? query.props : [query.props]; // {path: ['data', 'bar'], value: 'foo'}

	let results = [];
	let childrenArray = [component._impressInternal.iChildren];

	for (let i = 0; i < childrenArray.length; i++) {
		let children = childrenArray[i];

		for (let child of children) {
			let result = _impress.isQueryMatch(child, qData, qMethods, qNames, qProps);
			if (result != undefined) results.push(result);
			if (child._impressInternal.iChildren.size > 0) childrenArray.push(child._impressInternal.iChildren);
		}
	}
	return results;
};

/**
 *
 * @param {Object} component
 * @param {Object} query
 */
_impress.iClosest = (component, query) => {
	let qData = Array.isArray(query.data) || query.data == undefined ? query.data : [query.data]; // {path: ['data', 'bar'], value: 'foo', notValue}
	let qMethods = Array.isArray(query.methods) || query.methods == undefined ? query.methods : [query.methods];
	let qNames = Array.isArray(query.name) || query.name == undefined ? query.name : [query.name];
	let qProps = Array.isArray(query.props) || query.props == undefined ? query.props : [query.props]; // {path: ['data', 'bar'], value: 'foo', notValue}

	let result = undefined;
	let parent = component._impressInternal.iParent;
	while (parent != undefined && result == undefined) {
		result = _impress.isQueryMatch(parent, qData, qMethods, qNames, qProps);
		parent = parent._impressInternal.iParent;
	}
	return result;
};

/**
 *
 * @param {DOM element} targetNode
 * @returns
 */
_impress.getComponentByNode = (targetNode) => {
	if (targetNode != undefined) {
		let iGuid = targetNode.getAttribute('i-guid');
		return impressComponents.get(iGuid);
	}
};

/**
 *
 * @param {String} iGuid
 * @returns
 */
_impress.getComponentById = (iGuid) => {
	return impressComponents.get(iGuid);
};

/**
 *
 * @param {String} name
 * @returns
 */
_impress.getComponentsByName = (name) => {
	let componentArray = [];
	impressComponents.forEach((component, iGuid) => {
		if (component._impressInternal.name === name) componentArray.push(component);
	});
	return componentArray;
};

//IN-BUILT COMPONENTS

//I-FOR
class IFOR extends IMPRESS {
	#iterableType = undefined;
	#displayedSize = 0;
	#iforChildren = new Map();
	#isSingleChild = false;
	#templateNode;
	#template;
	constructor(node) {
		super(node);
		this.name = 'i-for';
		this.#templateNode = document.createElement('template');
		this.data.cachedMaps = new Map();
		this.data.iterablePropName = undefined;
		this._impressInternal.iSlotReactive = new Map();
		this._impressInternal.iSlotEvents = new Map();

		this.iDefine('observer', 'props.of', 'propsOf');
		this.iDefine('isPassThrough', true);
		this.iDefine('isShadowDOM', false);
	}
	beforeCreate() {
		let contentHTML = this._impressInternal.iNode.innerHTML;
		let valueAttribute;
		if (this?.props?.of !== undefined) {
			valueAttribute = this._impressInternal.iNode.getAttribute('let');
		} else if (this?.props.forEach !== undefined) {
			valueAttribute = this._impressInternal.iNode.getAttribute('value');
		}
		let keyAttribute = this._impressInternal.iNode.getAttribute('key');

		this.data.iterablePropName = valueAttribute.trim();
		if (keyAttribute != undefined) this.data.iterableKey = keyAttribute.trim();

		if (this._impressInternal.iNode.children.length === 1) this.#isSingleChild = true;
		if (this._impressInternal.iNode.children.length > 0) {
			if (contentHTML != undefined && contentHTML !== '') {
				let template = contentHTML;
				template = template.replaceAll(`{${this.data.iterablePropName}`, '{props.of.?');
				//template = template.replaceAll(`{${this.data.iterableKey}`, '{props.of.?');
				this.#template = $itemplate.iAttributesHtml(template, this._impressInternal.iSlotReactive, this._impressInternal.iSlotEvents);
			}
			this.#templateNode.innerHTML = this.#template;
		}
		this._impressInternal.iNode.innerHTML = '';
	}
	afterMount() {
		try {
			if (Array.isArray(this.props.of) === true) this.#iterableType = 'Array';
			else if (this.props.of instanceof Set) this.#iterableType = 'Set';
			else if (this.props.of instanceof Map) this.#iterableType = 'Map';

			if (this.#iterableType == undefined) $idebug.error('i-for', this);

			this.propsOf(this.props.of);
		} catch (error) {
			console.error(error);
			this.iDestroy();
		}
	}
	iRender(reactiveMap, isFirstSet = false, newValue) {
		reactiveMap.targetMap.forEach((name, iGuid) => {
			if (name === 'OBSERVER') {
				if (isFirstSet === false) {
					let observerFn = this._impressInternal.iObservers.get(reactiveMap.name);
					if (typeof this[observerFn] === 'function') this[observerFn](newValue);
					else if (typeof observerFn === 'function') observerFn(newValue);
				}
			} else if (name === 'TEXT') {
				this.props.of.forEach((value, key) => {
					let childNodes = this.#iforChildren.get(key);

					if (childNodes != undefined) {
						let v = $ireactive.getValueFromLookup(reactiveMap.resolvedDataOwner, reactiveMap.reactiveSubMap, reactiveMap.resolvedDataPathArray, [...this._impressInternal.keys, key]);

						if (this.#isSingleChild === true) {
							$ireactive.refreshTextNodes(childNodes, iGuid, v);
						} else {
							for (let i = 0; i < childNodes.length; i++) {
								$ireactive.refreshTextNodes(childNodes[i], iGuid, v);
							}
						}
					}
				});
			} else if (name.substring(0, 5) !== 'props') {
				this.props.of.forEach((value, key) => {
					let childNodes = this.#iforChildren.get(key);
					if (childNodes != undefined) {
						let v = $ireactive.getValueFromLookup(reactiveMap.resolvedDataOwner, reactiveMap.reactiveSubMap, reactiveMap.resolvedDataPathArray, [...this._impressInternal.keys, key]);
						if (this.#isSingleChild === true) {
							$ireactive.refreshAttribute(childNodes, iGuid, name, v, false);
						} else {
							for (let i = 0; i < childNodes.length; i++) {
								$ireactive.refreshAttribute(childNodes[i], iGuid, name, v, false);
							}
						}
					}
				});
			}
		});
	}

	//OBSERVERS
	propsOf(iterable) {
		let size = Array.isArray(iterable) ? iterable.length : iterable.size;
		if (size === 0 || size == undefined) {
			if (size === 0) {
				this.#iforChildren.clear();
				this._impressInternal.iChildren.clear();
				this._impressInternal.iNode.innerHTML = '';
				this.#displayedSize = size;
				return;
			}
		}
		if (this.#displayedSize === size) {
			return;
		} else if (this.#displayedSize < size) {
			let i = 0;
			iterable.forEach((value, key) => {
				if (i >= this.#displayedSize) {
					//if the use of key is required in th template of non-components we need to add te replace here - which is slower
					let childFragment = this.#templateNode.content.cloneNode(true);

					_impress.setiEventMaps(this, childFragment, this._impressInternal.iSlotEvents);
					//_impress.setiEventMaps(this, childFragment, impressObjects.get(currentComponent._impressInternal.name)._ievents);
					this._impressInternal.reactiveMaps.forEach((reactiveMap) => {
						$ireactive.setReactiveDataToDOM(this, childFragment, reactiveMap, true, [...this._impressInternal.keys, key]);
					});
					if (this.#isSingleChild === true) {
						this.#iforChildren.set(key, childFragment.children[0]);
					} else {
						let iForChild = Array.from(childFragment.childNodes);
						this.#iforChildren.set(key, iForChild);
					}
					//console.log(childFragment.childNodes[[0]]);
					this._impressInternal.createKey = key;
					this._impressInternal.iNode.appendChild(childFragment);
				}
				i++;
			});
			this.#displayedSize = size;
		} else {
			this.#iforChildren.forEach((child, key) => {
				if (Array.isArray(iterable)) {
					if (key >= iterable.length) {
						if (Array.isArray(child)) child.forEach((node) => node.remove());
						else child.remove();
						this.#iforChildren.delete(key);
					}
				} else {
					if (iterable.has(key) === false) {
						if (Array.isArray(child)) child.forEach((node) => node.remove());
						else child.remove();
						this.#iforChildren.delete(key);
					}
				}
			});
			this.#displayedSize = size;
		}
	}
}

//I-IF
class IIF extends IMPRESS {
	#templateNode;
	#template;
	constructor(node) {
		super(node);
		this.name = 'i-if';
		this.#templateNode = document.createElement('template');

		this.iDefine('observer', 'props.condition', 'propsCondition');
		this.iDefine('isPassThrough', true);
		this.iDefine('isShadowDOM', false);
	}
	beforeCreate() {
		let contentHTML = this._impressInternal.iNode.innerHTML;
		let condition = this._impressInternal.iNode.getAttribute('condition');
		if (condition != undefined && (condition.substring(0, 6) === '{props' || condition.substring(0, 5) === '{data')) {
			if (this._impressInternal.iNode.children.length > 0) {
				if (contentHTML != undefined && contentHTML !== '') {
					let template = contentHTML;
					template = this.template.replaceAll(`{${this.data.iterablePropName}`, '{props.of.?');
					this.#template = $itemplate.iAttributesHtml(template, this._impressInternal.iSlotReactive, this._impressInternal.iSlotEvents);
				}
				this.#templateNode.innerHTML = this.#template;
			}
		} else {
			$idebug.error('i-if', this);
		}
		this._impressInternal.iNode.innerHTML = '';
	}
	afterMount() {
		if (Object.hasOwn(this.props, 'condition') === true) {
			this.propsCondition(this.props.condition);
		} else {
			$idebug.error('i-if', this);
		}
	}
	iRender(reactiveMap, isFirstSet = false, newValue) {
		reactiveMap.targetMap.forEach((name, iGuid) => {
			if (name === 'OBSERVER') {
				if (isFirstSet === false) {
					let observerFn = this._impressInternal.iObservers.get(reactiveMap.name);
					if (typeof this[observerFn] === 'function') this[observerFn](newValue);
					else if (typeof observerFn === 'function') observerFn(newValue);
				}
			}
		});
	}
	//OBSERVER
	propsCondition(newVal) {
		if (newVal) {
			let childFragment = this.#templateNode.content.cloneNode(true);
			_impress.setiEventMaps(this, childFragment, this._impressInternal.iSlotEvents);
			//set any reactive data to the fragment
			this._impressInternal.reactiveMaps.forEach((reactiveMap) => {
				$ireactive.setReactiveDataToDOM(this, childFragment, reactiveMap, true, this._impressInternal.keys);
			});
			this._impressInternal.iNode.appendChild(childFragment);
		} else {
			this._impressInternal.iChildren.clear();
			this._impressInternal.iNode.innerHTML = '';
		}
	}
}

IMPRESS.register(IFOR);
IMPRESS.register(IIF);

export { IMPRESS };
