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
IMPRESS.create = (name, template, data, methods) => {
	name = name.toLowerCase();

	if (impressObjects[name] === undefined) {
		impressObjects[name] = new IMPRESSOBJECT(name, template, data, methods);
		//Callbacks to define HTML custom Element
		customElements.define(
			name,
			class extends HTMLElement {
				constructor() {
					super();
					this.classList.add('i-style');
					_impress.addComponent(this);
				}
				//Callback when components gets added to the DOM - "connected"
				connectedCallback() {}
				disconnectedCallback() {
					_impress.removeComponent(this);
				}
			}
		);
		return impressObjects[name];
	} else {
		throw new Error(`iMpress error ---  "${name}" impressComponent is already defined! Check modules for naming conflict`);
	}
};

IMPRESS.deepClone = (source, optionsObject = {}) => {
	if (source == undefined || typeof source !== 'object') {
		return source;
	}
	return _impress.deepClone(source, optionsObject);
};

IMPRESS.getComponentByNode = (targetNode) => {
	let iComponentNames = Object.keys(impressComponents);
	let i = iComponentNames.length;
	while (i--) {
		let component = impressComponents[iComponentNames[i]].find((v) => v.iNode === targetNode);
		if (component != undefined) return component;
	}
};

IMPRESS.getComponentById = (iGuid) => {
	let iComponentNames = Object.keys(impressComponents);
	let i = iComponentNames.length;
	while (i--) {
		let component = impressComponents[iComponentNames[i]].find((v) => v.iGuid === iGuid);
		if (component != undefined) return component;
	}
};

IMPRESS.getComponentsByName = (name) => {
	return impressComponents[name];
};

IMPRESS.removeComponent = (component) => {
	component.iNode.parentNode.removeChild(component.iNode);
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
 * destroy all impress objects of a certain type
 * @param {String} name
 */
IMPRESS.removeAll = (name) => {
	if (impressObjects[name] !== undefined) {
		for (let i = 0; i < impressComponents[name].length; i++) {
			let parentNode = impressComponents[name][i].iNode.parentNode;
			parentNode.removeChild(impressComponents[name][i].iNode);
		}
		//delete impressObjects[name];
	}
};

//PRIVATE/////////////////////////////////////////////////////////////////////
//Impress implementation methods
const _impress = {};
let _iGuid = 1000;

//CONSTRUCTOR METHODS
_impress.addComponent = (thisNode) => {
	let name = thisNode.localName;

	//add the component to impressComponents array.
	if (impressComponents[name] === undefined) {
		impressComponents[name] = [];
	}
	let parentNode = _impress.findParent(thisNode);
	let parentComponent = _impress.findParentComponent(parentNode);
	let len = impressComponents[name].push(new IMPRESSCOMPONENT(thisNode, parentComponent));
	let currentComponent = impressComponents[name][len - 1];

	if (parentComponent != undefined) {
		parentComponent.iChildren.push(currentComponent);
		if (parentComponent.hasMounted === true) {
			_impress.mountComponent(currentComponent);
		}
	} else {
		_impress.mountComponent(currentComponent);
	}
};

/**
 * @private
 * @description
 * mounts the component
 * @param {Object} currentComponent
 * 
 */
_impress.mountComponent = async (currentComponent) => {
	let iObject = impressObjects[currentComponent.name];
	if (typeof iObject.methods.created === 'function') {
		await iObject.methods.created(currentComponent);
	}
	//let iGuidTemplate = iObject.template.replace(/i-attribute="/g, `i-attribute="${currentComponent.iGuid}-`);
	currentComponent.iNode.innerHTML = iObject.template;
	currentComponent.iNode.setAttribute('i-guid', currentComponent.iGuid);
	let iTextNodes = _impress.getTextNodes(currentComponent);
	_impress.setiProps(currentComponent, iTextNodes);
	_impress.setiData(currentComponent, iTextNodes);
	_impress.setiAttributes(currentComponent);
	_impress.refreshComponent(currentComponent);
	currentComponent.hasMounted = true;
	if (typeof iObject.methods.mounted === 'function') {
		await iObject.methods.mounted(currentComponent);
	}
	for (let n = 0; n < currentComponent.iChildren.length; n++) {
		_impress.mountComponent(currentComponent.iChildren[n]);
	}
};

_impress.findParent = function (thisNode) {
	let parentNode = thisNode.parentNode;
	let parentName = parentNode.localName;
	while (parentNode.localName !== 'body' && impressComponents[parentName] === undefined) {
		parentNode = parentNode.parentNode;
		parentName = parentNode.localName;
	}
	if (parentName !== 'body') {
		return parentNode;
	} else {
		return undefined;
	}
};

_impress.findParentComponent = function (parentNode) {
	if (parentNode !== undefined) {
		let parentIndex = impressComponents[parentNode.localName].findIndex((v) => v.iNode === parentNode);
		return impressComponents[parentNode.localName][parentIndex];
	} else {
		return undefined;
	}
};

////////////////////////////////////////////////////////////////////////////////
//DESTRUCTOR METHODS

_impress.removeComponent = async (thisNode) => {
	let name = thisNode.localName;
	let index = impressComponents[name].findIndex((v) => v.iNode === thisNode);
	let iObject = impressObjects[name];
	let currentComponent = impressComponents[name][index];

	if (typeof iObject.methods.beforeDestroy === 'function') {
		await iObject.methods.beforeDestroy(currentComponent);
	}
	//remove observable references in parent iObject for props and data
	if (currentComponent.iParent != undefined) {
		let childIndex = currentComponent.iParent.iChildren.indexOf(currentComponent);
		if (childIndex !== -1) {
			currentComponent.iParent.iChildren.splice(childIndex, 1);
		}
	}
	//remove dataOwner links to child
	let propsKeys = Object.keys(currentComponent._propsMaps);
	for (let propsKey of propsKeys) {
		let propsMap = currentComponent._propsMaps[propsKey];
		let observerNames = Object.keys(propsMap.dataOwner._observables);

		for (let observerName of observerNames) {
			let observableIndex = propsMap.dataOwner._observables[observerName].target.indexOf(currentComponent);
			if (observableIndex !== -1) {
				propsMap.dataOwner._observables[observerName].target.splice(observableIndex, 1);
				propsMap.dataOwner._observables[observerName].dataName.splice(observableIndex, 1);
			}
		}
	}
	//remove all listeners
	for (let index = 0; index < currentComponent._iEventNodes.length; index++) {
		currentComponent._iEventNodes[index].removeEventListener(currentComponent._iEventListener[index].listener, currentComponent._iEventListener[index]);
	}
	if (typeof iObject.methods.destroyed === 'function') {
		await iObject.methods.destroyed(currentComponent);
	}
	impressComponents[name].splice(index, 1);
	if (impressComponents[name].length === 0) delete impressComponents[name];
};

////////////////////////////////////////////////////////////////////////////////
//DATA OBSERVER FUNCTIONS

_impress.getTextNodes = (currentComponent) => {
	let iTextNodes = [];
	let treeWalker = document.createNodeIterator(currentComponent.iNode, NodeFilter.SHOW_TEXT, (node) => {
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
 * sets any data observables to the component
 * scans the text nodes in the template and adds targets for the observables
 * @param {Object} currentComponent
 */
_impress.setiData = function (currentComponent, iTextNodes) {
	//match any `{data.` and link the target to the observer to allow interpolation of the text
	for (let i = 0; i < iTextNodes.length; i++) {
		let iDataDuplicates = [];
		let iDataValue = iTextNodes[i].nodeValue.match(/(data\.)[^\}\s]+/g);
		if (iDataValue == undefined) continue;
		//Add Observer for data match, avoid duplicates in same node as Observer algoritm replaces all data in any given node
		for (let n = 0, nLen = iDataValue.length; n < nLen; n++) {
			let dataPath = iDataValue[n];
			if (iDataDuplicates.includes(dataPath) === false) {
				iDataDuplicates.push(dataPath);
				let objProp = _impress.objectPath(currentComponent, dataPath);

				if (objProp == undefined) {
					throw new Error(`Data error: <${currentComponent.name}> --- i-module specifies data in template at:\n\n"${iTextNodes[i].outerHTML}"\n\ni-data attribute "${dataPath}" does not match data!`);
				}
				_impress.createDataObserver(currentComponent, dataPath);
				_impress.addDataObserverTarget(currentComponent, dataPath, iTextNodes[i]);
			}
		}
	}
};

/**
 * @private
 * @description
 * sets the data observers on the current component
 * @param {Object} currentComponent
 * @param {String} dataPath
 */
_impress.createDataObserver = (currentComponent, dataPath, isCreateDataTarget = true, dataTarget = currentComponent, dataName = dataPath) => {
	if (isCreateDataTarget === true && currentComponent._dataTargets[dataPath] == undefined) {
		currentComponent._dataTargets[dataPath] = {};
		currentComponent._dataTargets[dataPath].target = [];
		currentComponent._dataTargets[dataPath].replaceText = [];
	}
	if (currentComponent._observables[dataPath] == undefined) {
		currentComponent._observables[dataPath] = {};
		currentComponent._observables[dataPath].target = [];
		currentComponent._observables[dataPath].dataName = [];
	}
	if (currentComponent._observables[dataPath].target.includes(dataTarget) === false) {
		currentComponent._observables[dataPath].target.push(dataTarget);
		currentComponent._observables[dataPath].dataName.push(dataName);
	}
};

/**
 * @private
 * @description
 * adds a target node linked to an observable - these nodes will be replace whenever the obverver fires
 * @param {Object} currentComponent
 * @param {String} dataPath
 * @param {Object} target
 */
_impress.addDataObserverTarget = (currentComponent, dataPath, target) => {
	if (target != undefined) {
		currentComponent._dataTargets[dataPath].target.push(target);
		currentComponent._dataTargets[dataPath].replaceText.push(target.nodeValue);
	}
};

/**
 * @private
 * @description
 * component props constructor method - links the dataOwner of the prop via nameSpace lookup
 * adds observer for the props in the data owner observables structure
 * @param {Object} currentComponent
 */
_impress.setiProps = (currentComponent, iTextNodes) => {
	let attributes = currentComponent.iNode.attributes;
	let parentComponent = currentComponent.iParent;
	let isComponentPassedProps = false;
	for (let attribute of attributes) {
		if (attribute.value.indexOf('{props.') === 0 || attribute.value.indexOf('{data.') === 0) {
			isComponentPassedProps = true;
			break;
		}
	}

	if (parentComponent !== undefined && isComponentPassedProps === true) {
		//set props definitions passed into component in its attribute tag
		for (let i = 0, iLen = attributes.length; i < iLen; i++) {
			//restrict searched attributes to ones with {data.xxx} or {props.xxx}. You can pass props by "prop drilling".
			let isPropFromData = attributes[i].value.indexOf('{data.') === 0;
			let isPropFromProp = attributes[i].value.indexOf('{props.') === 0;
			if (isPropFromData === true || isPropFromProp === true) {
				//define the props name based on the attribute name
				let propsName = 'props.' + attributes[i].name;

				//create propsTargets object if it doesn't exist
				if (currentComponent._propsMaps[propsName] == undefined) currentComponent._propsMaps[propsName] = {};

				//find the ultimate owner of the data - i.e. is the from data or a prop from a prop
				let dataPath = attributes[i].value.replace(/[{}]/g, '');
				//nested props - decode namespace transformations to find true data owner and path
				if (dataPath.indexOf('data.') !== 0) {
					let propsData = _impress.propsToDataNamespaceConversion(currentComponent, dataPath);
					if (propsData == undefined) throw new Error(`iMpress error ---  "${currentComponent.name}" props: ${attributes[i].name}=${attributes[i].value} not map to anyy known data namespace!`);
					parentComponent = propsData.dataOwner;
					dataPath = propsData.dataName;
				}
				let objProp = _impress.objectPath(parentComponent, dataPath);

				//check parent for existence of data and set prop observer in child
				if (objProp != undefined) {
					currentComponent._propsMaps[propsName].dataPath = dataPath;
					currentComponent._propsMaps[propsName].dataPathArray = dataPath.match(/[^\[\]\.\{\}]+/g);
					currentComponent._propsMaps[propsName].dataOwner = parentComponent;
				} else {
					throw new Error(`iMpress error ---  "${currentComponent.name}" props: "${dataPath}" does not exits as data in parent "${parentComponent.name}"\nValue ${attributes[i].name}=${attributes[i].value} not defined in data!`);
				}
			}
		}
		//for each prop set the textNode Observers
		_impress.setiPropsTextNodeObserables(currentComponent, iTextNodes);
	}
};

/**
 * @private
 * @description
 * sets the props text node observers
 * @param {Object} currentComponent
 * @param {Array} iTextNodes
 */
_impress.setiPropsTextNodeObserables = (currentComponent, iTextNodes) => {
	if (iTextNodes.length > 0) {
		for (let i = 0; i < iTextNodes.length; i++) {
			let iDataDuplicates = [];
			let propsMatches = iTextNodes[i].nodeValue.match(/(props\.)[^\}\s]+/g);
			if (propsMatches == undefined) continue;
			//Add Observer for data match, avoid duplicates in same node as Observer algoritm replaces all data in any given node
			for (let n = 0; n < propsMatches.length; n++) {
				let propsData = _impress.propsToDataNamespaceConversion(currentComponent, propsMatches[n]);

				if (iDataDuplicates.includes(propsData.propsName) === false) {
					iDataDuplicates.push(propsData.propsName);

					if (propsData != undefined) {
						let objProp = _impress.objectPath(propsData.dataOwner, propsData.dataPathArray);

						if (objProp == undefined) {
							throw new Error(`iMpress error ---  <${currentComponent.name} > --- impress module specifies data in template at:\n\n"${iTextNodes[i].nodeValue}"\n\ndata property "${propsMatches[n]}" does not exist!`);
						} else {
							let parentComponent = propsData.dataOwner;
							
							if (parentComponent._observables[propsData.dataName] == undefined) {
								parentComponent._observables[propsData.dataName] = {};
								parentComponent._observables[propsData.dataName].target = [];
								parentComponent._observables[propsData.dataName].dataName = [];
							}
							parentComponent._observables[propsData.dataName].target.push(currentComponent);
							parentComponent._observables[propsData.dataName].dataName.push(propsData.propsPath);

							if (currentComponent._dataTargets[propsData.propsPath] == undefined) {
								currentComponent._dataTargets[propsData.propsPath] = {};
								currentComponent._dataTargets[propsData.propsPath].target = [];
								currentComponent._dataTargets[propsData.propsPath].replaceText = [];
							}
							_impress.addDataObserverTarget(currentComponent, propsData.propsPath, iTextNodes[i]);
						}
					} else {
						//throw
					}
				}
			}
		}
	}
};

///////////////////////////////////
//ATTRIBUTES

/**
 * @private
 * @description
 * Sets an observer for the attribute if it doesn't exit
 * Sets the attribute to the value of the observer
 * @param {Object} currentComponent
 */
_impress.setiAttributes = function (currentComponent) {
	let iObject = impressObjects[currentComponent.name];

	for (let index = 0, iLen = iObject._attributes.length; index < iLen; index++) {
		let iAttrIndex = iObject._attributes[index];
		let attrNode = currentComponent.iNode.querySelector(`[i-attribute="${iAttrIndex}"]`);
		if (attrNode == undefined) continue;

		let n = impressAttributes[iAttrIndex].length;
		while (n--) {
			let v = impressAttributes[iAttrIndex][n];

			if (v.attributeName !== 'i-event') {
				let value;

				if (v.attributeValue.indexOf('props.') === 0) {
					let propsData = _impress.propsToDataNamespaceConversion(currentComponent, v.attributeValue);
					if (propsData != undefined) {
						value = _impress.get(propsData.dataOwner, ...propsData.dataPathArray);

						_impress.createDataObserver(propsData.dataOwner, propsData.dataName, false, currentComponent, propsData.propsName);
					}
				} else if (v.attributeValue.indexOf('data.') === 0) {
					_impress.createDataObserver(currentComponent, v.attributeValue, false);

					let dataPathArray = v.attributeValue.match(/[^\[\]\.\{\}]+/g);
					value = _impress.get(currentComponent, ...dataPathArray);
				}
				attrNode.setAttribute(v.attributeName, value);
			} else {
				_impress.setiEvents(currentComponent, attrNode, v);
			}
		}
	}
};

////////////////////////////////////////////////////////////////////////////////
//IEVENTS//
//setiEvents on template object
_impress.handleEvent = function (iEventObject, argumentArray) {
	let argsToData = argumentArray.map((v) => {
		if (v === '$e' || v === '$event') {
			v = iEventObject;
		} else if (v === '$parent') {
			v = currentComponent.iParent;
		} else if (v === '$component') {
			v = currentComponent;
		} else if (impressObjects[currentComponent.name].data[v] !== undefined) {
			v = impressObjects[currentComponent.name].data[v];
		}
		return v;
	});
	impressObjects[currentComponent.name].methods[fCall](...argsToData);
};

_impress.setiEvents = function (currentComponent, attrNode, eventAttribute) {
	let nodeIndex = currentComponent._iEventNodes.push(attrNode);
	nodeIndex--;
	let jsonData = eventAttribute.attributeValue; //impressAttributes[iAttrIndex][n].attributeValue;

	for (let jsonKey in jsonData) {
		let argumentArray = jsonData[jsonKey];
		//destructure the string, remove empty brackets, convert first bracket to "," if contains arguments, remove second bracket, split to CSV
		argumentArray = argumentArray.replace('()', '').replace('(', ',').replace(')', '').split(',');
		let listener = jsonKey;
		//splice off the method leaving just the arguments
		let fCall = argumentArray[0];
		argumentArray.splice(0, 1);

		//add the listener if defined, and call the listener with the arguments once converted from strings into data object of data[argumentArray[index]]
		if (listener !== undefined) {
			if (impressObjects[currentComponent.name][fCall]) {
				//check if method is impressObjects prototype method

				currentComponent._iEventNodes[nodeIndex].addEventListener(listener, () => {
					currentComponent[fCall](...argumentArray);
				});
			} else if (impressObjects[currentComponent.name].methods[fCall] !== undefined) {
				//check if method is iObject custom method

				let index = currentComponent._iEventListener.push({});
				index--;
				currentComponent._iEventListener[index].listener = listener;
				currentComponent._iEventListener[index].handleEvent = (iEventObject) => {
					let argsToData = argumentArray.map((v) => {
						if (v === '$e' || v === '$event') {
							v = iEventObject;
						} else if (v === '$c' || v === '$component') {
							v = currentComponent;
						} else if (impressObjects[currentComponent.name].data[v] != undefined) {
							v = impressObjects[currentComponent.name].data[v];
						} else if (parseFloat(v) === Number(v)) {
							v = parseFloat(v);
						}
						return v;
					});
					impressObjects[currentComponent.name].methods[fCall](...argsToData);
				};
				currentComponent._iEventNodes[index].addEventListener(currentComponent._iEventListener[index].listener, currentComponent._iEventListener[index]);
			} else {
				throw new Error(`iMpress warning ---  i-event "${listener}" method ${fCall}() is undefined in "${currentComponent.name}"`);
			}
		} else {
			throw new Error(`iMpress error --- no listener on i-event object at:\n${currentComponent.name}\ni-event attribute only accepts correctly formatted JSON string data\nwhere "key":"value" pairs correspond to listener and module method respectively`);
		}
	}
};

////////////////////////////////////////////////////////////////////////////////
//UPDATE STATE//

_impress.propsToDataNamespaceConversion = (currentComponent, pathString) => {
	let propsPathArray = pathString.match(/[^\[\]\.\{\}]+/g);
	let dataPathArray;
	let propsName = 'props';

	for (let i = 1, iLen = propsPathArray.length; i < iLen; i++) {
		if (dataPathArray == undefined) propsName = `${propsName}.${propsPathArray[i]}`;
		else dataPathArray.push(propsPathArray[i]);

		if (dataPathArray == undefined && currentComponent._propsMaps[propsName] != undefined) {
			dataPathArray = currentComponent._propsMaps[propsName].dataPathArray.slice(0);
		}
	}
	if (dataPathArray != undefined) return { dataName: dataPathArray.join('.'), dataPathArray: dataPathArray, propsName: propsName, propsPath: pathString, dataOwner: currentComponent._propsMaps[propsName].dataOwner };
};

/**
 * @private
 * @description
 * Sets data or props state
 * props are mapped to data owner
 * @param {Object} currentComponent
 * @param {*} value
 * @param {String} pathString
 */
_impress.setState = (currentComponent, value, pathString) => {
	if (pathString == undefined){
		let dataKeys = Object.keys(currentComponent._observables);
		for (let dataKey of dataKeys){
			let dataPathArray = dataKey.split('.');			
			_impress.refreshData(currentComponent, dataKey, dataPathArray);
		}
		let propsKeys = Object.keys(currentComponent._propsMaps);
		for (let propsKey of propsKeys) {
			let propsData = _impress.propsToDataNamespaceConversion(currentComponent, propsKey);
			_impress.refreshData(propsData.dataOwner, propsData.dataName, propsData.dataPathArray);		
		}
	} else if (pathString === 'props') {
		let propsKeys = Object.keys(currentComponent._propsMaps);
		
		for (let propsKey of propsKeys) {
			let propName = propsKey.replace('props.', '');
			if (value.hasOwnProperty(propName)) {
				let propsData = _impress.propsToDataNamespaceConversion(currentComponent, propsKey);

				if (propsData != undefined) {
					_impress.set(value[propName], propsData.dataOwner, ...propsData.dataPathArray);
					_impress.refreshData(propsData.dataOwner, propsData.dataName, propsData.dataPathArray);
				}
			}
		}
	} else if (pathString.indexOf('props.') === 0) {
		let propsData = _impress.propsToDataNamespaceConversion(currentComponent, pathString);

		if (propsData != undefined) {
			_impress.set(value, propsData.dataOwner, ...propsData.dataPathArray);
			_impress.refreshData(propsData.dataOwner, propsData.dataName, propsData.dataPathArray);
		} else {
			throw new Error(`iMpress error ---  <${currentComponent.name} > --- props: ${pathString} are not defined!`);
		}
	} else if (pathString.indexOf('data.') === 0) {
		let dataPathArray = pathString.match(/[^\[\]\.\{\}]+/g);

		_impress.set(value, currentComponent, ...dataPathArray);
		_impress.refreshData(currentComponent, pathString, dataPathArray);
	}
};

/**
 * @private
 * @description
 * gets data or props state
 * props are mapped to data owner
 * used mainly for props as data is accessible via owner
 * @param {Object} currentComponent
 * @param {String} pathString
 * @returns {*}
 */
_impress.getState = (currentComponent, pathString) => {
	if (pathString.indexOf('props.') === 0) {
		let propsData = _impress.propsToDataNamespaceConversion(currentComponent, pathString);

		if (propsData != undefined) {
			return _impress.get(propsData.dataOwner, ...propsData.dataPathArray);
		} else {
			throw new Error(`iMpress error ---  <${currentComponent.name} > --- props: ${pathString} are not defined!`);
		}
	} else if (pathString.indexOf('data.') === 0) {
		let dataPathArray = pathString.match(/[^\[\]\.\{\}]+/g);

		return _impress.get(currentComponent, ...dataPathArray);
	}
};

//refresh screen data for all components of impressObject type (used at initial load)
/**
 * @private
 * @description
 * refreshes all components of an object class
 * would be used only for root object template/data change
 * not currently used!!!
 * @param {Object} iObject
 */
_impress.refreshAll = function (iObject) {
	let impressObserverTargets = [];
	let observerTarget;

	for (let keyString in iObject._observables) {
		for (let i = 0; i < iObject._observables[keyString].target.length; i++) {
			observerTarget = undefined;
			if (iObject._observables[keyString].dataName[i].indexOf('props.') === 0) {
				observerTarget = iObject._observables[keyString].target[i].propsTargets[iObject._observables[keyString].dataName[i]];
			}
			if (iObject._observables[keyString].dataName[i].indexOf('data.') === 0) {
				observerTarget = iObject._observables[keyString].target[i]._dataTargets[iObject._observables[keyString].dataName[i]];
			}
			if (observerTarget) {
				for (let n = 0; n < observerTarget.target.length; n++) {
					if (impressObserverTargets.indexOf(observerTarget.target[n]) === -1) {
						let dataPathArray = keyString.match(/[^\[\]\.\{\}]+/g);
						let value = _impress.get(iObject, ...dataPathArray);
						let replaceText = observerTarget.replaceText[n].replace(`{${keyString}}`, value);
						observerTarget.target[n].nodeValue = replaceText;
						impressObserverTargets.push(observerTarget.target[n]);
					}
				}
			}
		}
	}
};

/**
 * @private
 * @description
 * refresh screen data for single component
 * first load - (used when dynamically adding component)
 * @param {Object} currentComponent
 */
_impress.refreshComponent = function (currentComponent) {
	let pathStrings = Object.keys(currentComponent._dataTargets);

	for (let pathString of pathStrings) {
		for (let n = 0; n < currentComponent._dataTargets[pathString].target.length; n++) {
			let dataOwner, dataPathArray;

			if (pathString.indexOf('props.') === 0) {
				let propsData = _impress.propsToDataNamespaceConversion(currentComponent, pathString);

				dataPathArray = propsData.dataPathArray;
				dataOwner = propsData.dataOwner;
			} else {
				dataPathArray = pathString.match(/[^\[\]\.\{\}]+/g);
				dataOwner = currentComponent;
			}

			let value = _impress.get(dataOwner, ...dataPathArray);
			let replaceText = currentComponent._dataTargets[pathString].replaceText[n].replace(`{${pathString}}`, value);

			currentComponent._dataTargets[pathString].target[n].nodeValue = replaceText;
		}
	}
};

/**
 * @private
 * @description
 * Called by setState to refresh an individual component data
 * @param {Object} component
 * @param {String} pathString
 * @param {Array} dataPathArray
 */
_impress.refreshData = (dataOwner, pathString, dataPathArray) => {
	if (dataOwner == undefined) return;

	let observerKeys = Object.keys(dataOwner._observables);
	let observerNames = observerKeys.filter((v) => v.indexOf(pathString) === 0);

	for (let observerName of observerNames) {
		//observerName will not equal pathSting when a whole object has been modified
		if (observerName != pathString) dataPathArray = observerName.split('.');

		let i = dataOwner._observables[observerName].target.length;
		let value = _impress.get(dataOwner, ...dataPathArray);

		while (i--) {
			let component = dataOwner._observables[observerName].target[i];
			let dataName = dataOwner._observables[observerName].dataName[i];
			let n = component._dataTargets[dataName] != undefined ? component._dataTargets[dataName].target.length : 0;

			//set the data to all the dataTargets linking to the observer of the dataOwner
			while (n--) {
				let replaceText = component._dataTargets[dataName].replaceText[n].replace(`{${dataName}}`, value);

				component._dataTargets[dataName].target[n].nodeValue = replaceText;
			}
			_impress.refreshAttribute(component, dataName);
		}
	}
};

/**
 * @private
 * @description
 * refreshes an attribute - called by refresh data
 * @param {Object} currentComponent
 * @param {String} attrValue
 */
_impress.refreshAttribute = (currentComponent, attrValue) => {
	let attributes = impressObjects[currentComponent.name]._attributes;

	for (let i = 0, iLen = attributes.length; i < iLen; i++) {
		let vAttributeArray = impressAttributes[attributes[i]].filter((v) => v.attributeValue === attrValue);

		for (let attribute of vAttributeArray) {
			//lookup props or data from the relevant observable to the attribute

			if (attrValue.indexOf('props.') === 0) {
				let propsData = _impress.propsToDataNamespaceConversion(currentComponent, attrValue);
				if (propsData != undefined) {
					let value = _impress.get(propsData.dataOwner, ...propsData.dataPathArray);
					let attrNode = currentComponent.iNode.querySelector(`[i-attribute="${attributes[i]}"]`);

					if (attribute.attributeName === 'value' && attrNode.localName === 'input') {
						attrNode.value = value;
					} else {
						attrNode.setAttribute(attribute.attributeName, value);
					}
				}
			} else if (attrValue.indexOf('data.') === 0) {
				let dataPathArray = attrValue.match(/[^\[\]\.\{\}]+/g);
				let value = _impress.get(currentComponent, ...dataPathArray);
				let attrNode = currentComponent.iNode.querySelector(`[i-attribute="${attributes[i]}"]`);

				if (attribute.attributeName === 'value' && attrNode.localName === 'input') {
					attrNode.value = value;
				} else {
					attrNode.setAttribute(attribute.attributeName, value);
				}
			}
		}
	}
};

////////////////////////////////////////////////////////////////////////////////
//HELPER FUNCTIONS — conversion of template strings to Objects

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

	return obj[final] != undefined ? { dataObject: obj, dataProperty: final } : undefined;
};

//Generate a new unique indentifier
_impress.newGUID = function () {
	_iGuid += 5;
	return _iGuid.toString(36);
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

_impress.iAttributesHtml = function (iObject) {
	let { template, name } = iObject;
	let tempLines;

	tempLines = template.match(/(<[^>]+)>|[^<>]+/g);
	for (let i = 0, tLen = tempLines.length; i < tLen; i++) {
		let v = tempLines[i];

		if (v[0] === '<' && (v.includes('{props.') || v.includes('{data.') || v.includes('i-event'))) {
			let tag = v.match(/<[^\s]+/);
			tag = tag[0].slice(1);
			//test tagline for attribute match, get new GUID if present, remove attributes from tagline and add to impressAttributes{[]}
			let attr = v.match(/[^\s]+(?=})}/g);

			if (attr != undefined && !impressObjects[tag]) {
				let _iGuid = _impress.newGUID();
				impressAttributes[_iGuid] = [];
				let vAttrIndex = 0;
				let vAttrLength = attr.length;
				while (vAttrIndex < vAttrLength) {
					let vAttr = attr[vAttrIndex];
					let nameValueArray = vAttr.split('=');

					//detect JSON or not using ":" test
					if (nameValueArray[1].includes(':') === false) nameValueArray[1] = nameValueArray[1].substring(1, nameValueArray[1].length - 1);
					else nameValueArray[1] = JSON.parse(nameValueArray[1]);
					impressAttributes[_iGuid].push({ attributeName: nameValueArray[0], attributeValue: nameValueArray[1] });

					//replace the attribute in the markup with a reference
					if (vAttrIndex === 0) {
						tempLines[i] = tempLines[i].replace(vAttr, `i-attribute="${_iGuid}"`);
					} else {
						tempLines[i] = tempLines[i].replace(vAttr, '');
					}
					//record the attribute key lookups in iObject._attributes array
					if (iObject._attributes == undefined) iObject._attributes = [];
					if (iObject._attributes.includes(_iGuid) === false) iObject._attributes.push(_iGuid);
					vAttrIndex++;
				}
			}
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

			if (Array.isArray(sourceArray[j]) === true) isArray = true;
			else keys = Object.keys(sourceArray[j]);

			for (let i = 0, iLen = keys.length; i < iLen; i++) {
				let propertyKey = isArray ? i : keys[i];
				let isPrimitiveType = sourceArray[j][propertyKey] == undefined || (typeof sourceArray[j][propertyKey] !== 'object' && typeof sourceArray[j][propertyKey] !== 'function');

				if (isPrimitiveType === true) {
					targetArray[j][propertyKey] = sourceArray[j][propertyKey];
				} else {
					let propertyType = Object.prototype.toString.call(sourceArray[j][propertyKey]);

					switch (propertyType) {
						case '[object Object]':
							targetArray[j][propertyKey] = {};
							sourceObjectsArray.push(sourceArray[j][propertyKey]);
							targetObjectsArray.push(targetArray[j][propertyKey]);
							break;
						case '[object Array]':
							targetArray[j][propertyKey] = [];
							sourceObjectsArray.push(sourceArray[j][propertyKey]);
							targetObjectsArray.push(targetArray[j][propertyKey]);
							break;
						case '[object File]':
							let blob = sourceArray[j][propertyKey];
							targetArray[j][propertyKey] = new File([blob], blob.name, { type: blob.type });
							break;
						case '[object Blob]':
							targetArray[j][propertyKey] = new Blob([sourceArray[j][propertyKey]], { type: sourceArray[j][propertyKey].type });
							break;
						default:
							targetArray[j][propertyKey] = undefined;
					}
				}
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
	let componentArray = component.iChildren;
	let result;
	let i = 0;
	while (componentArray[i] != undefined){
		let keys = Object.keys(query);
		if (_impress.get(componentArray[i], query){
			result = componentArray[i];
		} else {
			componentArray.push(...componentArray[i].iChildren);
		}
		if (result != undefined) break; 
		i++;
	}
	return result;
}*/

/*_impress.iQueryAll = (component, query) => {
	let componentArray = component.iChildren;
	let result = [];
	let i = 0;
	while (componentArray[i] != undefined){
		let keys = Object.keys(query);
		if (_impress.get(componentArray[i], query){
			result.push(componentArray[i]);
		} else {
			componentArray.push(...componentArray[i].iChildren);
		}
		i++;
	}
	return result;
}*/

//CLASSES///////////////////////////////////////////////////////////////////////
//
const impressObjects = {};
const impressComponents = {};
const impressAttributes = {};

class IMPRESSOBJECT {
	constructor(name, template = '', data, methods) {
		this.name = name;
		this.data = data;
		this.methods = methods;
		this._attributes = [];
		this.template = _impress.correctHtml(template);
		this.template = _impress.iAttributesHtml(this);
	}
}

class IMPRESSCOMPONENT {
	constructor(iNode, parentComponent) {
		let iObject = impressObjects[iNode.localName];
		this.iGuid = _impress.newGUID();
		this.iNode = iNode;
		this.name = iNode.localName;
		this.iParent = parentComponent;
		this.iChildren = [];
		this.iRoot = this.iParent == undefined ? this : this.iParent.iRoot;
		this.data = typeof iObject.data === 'function' ? iObject.data() : _impress.deepClone(iObject.data);
		this.hasMounted = false;
		//make below private?
		this._iEventNodes = [];
		this._iEventListener = [];
		this._dataTargets = {};
		this._observables = {}; //observables obverse only data, props are observed in the true dataOwner
		this._propsMaps = {};
	}

	setState(value, pathString) {
		_impress.setState(this, value, pathString);
	}
	getProps(pathString) {
		if (pathString == undefined) {
			let propsKeys = Object.keys(this._propsMaps);
			let props = {};

			for (let propsKey of propsKeys) {
				let propName = propsKey.replace('props.', '');
				let propValue = IMPRESS.deepClone(_impress.getState(this, propsKey));
				props[propName] = propValue;
			}
			return props;
		} else {
			return IMPRESS.deepClone(_impress.getState(this, pathString));
		}
	}
}
