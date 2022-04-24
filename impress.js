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
IMPRESS.create = (name, template, data = {}, methods = {}) => {
	name = name.toLowerCase();

	if (impressObjects[name] == undefined) {
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
				//connectedCallback() {
				//	_impress.connectComponent(this);
				//}
				disconnectedCallback() {
					_impress.disconnectComponent(this);
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
	if (targetNode != undefined) {
		let iGuid = targetNode.getAttribute('i-guid');
		return impressComponents[iGuid];
	}
};

IMPRESS.getComponentById = (iGuid) => {
	return impressComponents[iGuid];
};

IMPRESS.getComponentsByName = (name) => {
	let componentArray = [];
	let componentGuidKeys = Object.keys(impressComponents);
	for (let i = 0, component; (component = impressComponents[componentGuidKeys[i]]) !== undefined; i++) {
		if (component.name === name) componentArray.push(component);
	}
	return componentArray;
};

IMPRESS.destroyComponent = (component) => {
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
_impress.addComponent = (thisNode) => {
	let currentComponent = new IMPRESSCOMPONENT(thisNode);

	if (currentComponent.iParent != undefined) {
		currentComponent.iParent.iChildren.push(currentComponent);
		if (currentComponent.iParent.isMounted === true) _impress.createComponent(currentComponent);
	} else {
		_impress.createComponent(currentComponent);
	}
};

/*_impress.connectComponent = (thisNode) => {
	let name = thisNode.localName;
	let currentComponent = IMPRESS.getComponentByNode(thisNode, name);

	if (currentComponent.isMounted === false) {
		//console.log('connectedCallback - mounted false', currentComponent.name);
	} else {
		let iObject = impressObjects[name];
		console.log('connectedCallback - appended', currentComponent.name, currentComponent.iNode.isConnected);
		//TODO refresh - i-for data if appened
		//TODO what do we do about the parent and props of appended i-for nodes moved outside of the i-for structure???
		if (typeof iObject.methods.afterAppend === 'function') {
			iObject.methods.afterAppend(currentComponent);
		}
	}
};*/

/**
 * @private
 * @description
 * mounts the component
 * @param {Object} currentComponent
 *
 */
_impress.createComponent = async (currentComponent) => {
	let iObject = impressObjects[currentComponent.name];

	if (typeof iObject.methods.beforeCreate === 'function') await iObject.methods.beforeCreate(currentComponent);
	//let iGuidTemplate = iObject.template.replace(/i-attribute="/g, `i-attribute="${currentComponent.iGuid}-`);

	//currentComponent.iNode.innerHTML = iObject.template;
	currentComponent.iNode.appendChild(iObject.templateNode.content.cloneNode(true));

	_impress.setiProps(currentComponent);
	_impress.setiData(currentComponent);
	_impress.setiAttributes(currentComponent);
	_impress.refreshComponent(currentComponent);
	//component has mounted
	currentComponent.isMounted = true;

	if (typeof iObject.methods.afterMounted === 'function') await iObject.methods.afterMounted(currentComponent);

	for (let n = 0; n < currentComponent.iChildren.length; n++) {
		_impress.createComponent(currentComponent.iChildren[n]);
	}
};

_impress.findParentComponentByNode = function (thisNode) {
	let parentNode = thisNode.parentNode;
	let parentName = parentNode.localName;

	while (parentNode.localName !== 'body' && impressObjects[parentName] === undefined) {
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
	let currentComponent = impressComponents[iGuid];

	//if component node is still connected it has been appended
	if (currentComponent == undefined) return;

	//if the node is still connected, the component has been appened/added somewhere else in the DOM
	if (thisNode.isConnected === true) {
		let iObject = impressObjects[name];
		let parentComponent = currentComponent.iParent;
		if (typeof iObject.methods.afterMove === 'function') iObject.methods.afterMove(currentComponent);
		if (parentComponent != undefined && typeof impressObjects[parentComponent.name].methods.childMoved === 'function') impressObjects[parentComponent.name].methods.childMoved(parentComponent, currentComponent);
		return;
	}
	//TODO destroy all children - asycn promise issue
	//create a flattened array of the component tree starting from the currentComponent
	if (currentComponent.iChildren[0] === undefined) {
		_impress.destroyComponent(currentComponent);
	} else {
		let componentArray = [currentComponent];
		let j = 0;
		while (componentArray[j] !== undefined) {
			componentArray.push(...componentArray[j].iChildren);
			j++;
		}
		//loop backwards and destroy all the components
		for (let i = componentArray.length - 1, component; (component = componentArray[i]) !== undefined; i--) {
			_impress.destroyComponent(component);
		}
	}
};

_impress.destroyComponent = async (currentComponent) => {
	let name = currentComponent.name;
	let iObject = impressObjects[name];

	if (typeof iObject.methods.beforeDestroy === 'function') await iObject.methods.beforeDestroy(currentComponent);
	//remove iChildren references in parent
	if (currentComponent.iParent != undefined) {
		let childIndex = currentComponent.iParent.iChildren.indexOf(currentComponent);
		if (childIndex !== -1) currentComponent.iParent.iChildren.splice(childIndex, 1);
	}
	//remove dataOwner links to child
	let propsKeys = Object.keys(currentComponent._propsMaps);
	for (let propsKey of propsKeys) {
		let propsMap = currentComponent._propsMaps[propsKey];
		let observableIndex = propsMap.dataOwner._observables[propsMap.dataPath].target.indexOf(currentComponent);
		if (observableIndex !== -1) {
			if (propsMap.dataOwner._observables[propsMap.dataPath].target[1] !== undefined) {
				propsMap.dataOwner._observables[propsMap.dataPath].target.splice(observableIndex, 1);
				propsMap.dataOwner._observables[propsMap.dataPath].dataName.splice(observableIndex, 1);
			} else {
				delete propsMap.dataOwner._observables[propsMap.dataPath];
			}
		}
	}
	//remove all listeners
	for (let index = 0; index < currentComponent._iEventNodes.length; index++) {
		currentComponent._iEventNodes[index].removeEventListener(currentComponent._iEventListener[index].listener, currentComponent._iEventListener[index]);
	}
	if (typeof iObject.methods.destroyed === 'function') await iObject.methods.destroyed(currentComponent);
	//ported nodes are not in their parent component - they must be removed manually
	if (currentComponent.iNode.isConnected === true) {
		let iNode = currentComponent.iNode;
		delete impressComponents[currentComponent.iGuid];
		iNode.parentNode.removeChild(iNode);
	} else {
		delete impressComponents[currentComponent.iGuid];
	}
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
 * TODO
 * @param {Object} currentComponent
 */
_impress.setiData = function (currentComponent) {
	let iObject = impressObjects[currentComponent.name];
	let pathStrings = Object.keys(iObject._textData);

	for (let pathString of pathStrings) {
		if (pathString.indexOf('data.') === 0) {
			_impress.createDataObserver(currentComponent, pathString);
		} else {
			let propsData = _impress.propsToDataNamespaceConversion(currentComponent, pathString);
			_impress.createDataObserver(propsData.dataOwner, propsData.dataName, currentComponent, propsData.propsName);
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
_impress.createDataObserver = (currentComponent, dataPath, dataTarget = currentComponent, dataName = dataPath) => {
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

_impress.mapPropToDataOwner = (currentComponent, pathString) => {
	let propsPathArray = pathString.match(/[^\[\]\.\{\}]+/g);
	let dataPathArray;
	let propsName = 'props';

	for (let i = 1, pathPart; (pathPart = propsPathArray[i]) !== undefined; i++) {
		if (dataPathArray == undefined) propsName = `${propsName}.${pathPart}`;
		else dataPathArray.push(pathPart);

		if (dataPathArray == undefined && currentComponent.iParent._propsMaps[propsName] != undefined) {
			dataPathArray = currentComponent.iParent._propsMaps[propsName].dataPathArray.slice(0);
		}
	}

	if (dataPathArray != undefined) return { dataName: dataPathArray.join('.'), dataPathArray: dataPathArray, propsName: propsName, propsPath: pathString, dataOwner: currentComponent.iParent._propsMaps[propsName].dataOwner };
};

/**
 * @private
 * @description
 * component props constructor method - links the dataOwner of the prop via nameSpace lookup
 * props are detailed in the tag of the Custom Element child component, once set they are removed from the DOM
 * only props and i-for attributes can be added to the tag of a Custom Element child component
 * i-events and other attributes are invalid on Custom Element child components
 * adds observer for the props in the data owner observables structure
 * @param {Object} currentComponent
 */
_impress.setiProps = (currentComponent) => {
	let attributes = currentComponent.iNode.attributes;
	let dataOwner = currentComponent.iParent;
	let isComponentPassedProps = false;

	for (let attribute of attributes) {
		if (attribute.value.indexOf('{props.') === 0 || attribute.value.indexOf('{data.') === 0) {
			isComponentPassedProps = true;
			break;
		}
	}

	if (dataOwner !== undefined && isComponentPassedProps === true) {
		//set props definitions passed into component in its attribute tag
		let i = attributes.length;
		while (i--) {
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
				let dataPathArray;
				//nested props - decode namespace transformations to find true data owner and path
				if (isPropFromProp === true) {
					let propsMap = _impress.mapPropToDataOwner(currentComponent, dataPath);

					if (propsMap == undefined) throw new Error(`iMpress error ---  "${currentComponent.name}" props: ${attributes[i].name}=${attributes[i].value} - does not map to any known data namespace!`);

					dataOwner = propsMap.dataOwner;
					dataPath = propsMap.dataName;
					dataPathArray = propsMap.dataPathArray;
				} else {
					//normalise the dataPath and dataPathArray
					dataPathArray = dataPath.match(/[^\[\]\.\{\}]+/g);
					dataPath = dataPathArray.join('.');
				}
				let objProp = _impress.objectPath(dataOwner, dataPath);
				if (objProp != undefined && objProp.dataObject.hasOwnProperty(objProp.dataProperty)) {
					//create a map in the child to the parent dataOwner
					currentComponent._propsMaps[propsName].dataPath = dataPath;
					currentComponent._propsMaps[propsName].dataPathArray = dataPathArray;
					currentComponent._propsMaps[propsName].dataOwner = dataOwner;

					//create an observable map in the dataOwner
					_impress.createDataObserver(dataOwner, dataPath, currentComponent, propsName);
				} else {
					throw new Error(`iMpress error ---  "${currentComponent.name}" props: "${dataPath}" does not exits as data in parent "${parentComponent.name}"\nValue ${attributes[i].name}=${attributes[i].value} not defined in data!`);
				}
				//TODO do we need to remove props??
				currentComponent.iNode.removeAttribute(attributes[i].name);
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
						_impress.createDataObserver(propsData.dataOwner, propsData.dataName, currentComponent, propsData.propsName);
					}
				} else if (v.attributeValue.indexOf('data.') === 0) {
					_impress.createDataObserver(currentComponent, v.attributeValue);

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
		let fCall = argumentArray[0].trim();
		argumentArray.shift();

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
					let argsToData = [];
					for (let i = 0, v; (v = argumentArray[i]) !== undefined; i++) {
						v = v.trim();
						if (v === '$e' || v === '$event') {
							v = iEventObject;
						} else if (v === '$c' || v === '$component') {
							v = currentComponent;
						} else if (parseFloat(v) === Number(v)) {
							v = parseFloat(v);
						} else if (v.indexOf('data.') === 0) {
							v = _impress.get(currentComponent, ...v.match(/[^\[\]\.\{\}]+/g));
						} else if (v.indexOf('props.') === 0) {
							let propsData = _impress.propsToDataNamespaceConversion(currentComponent, v);
							if (propsData != undefined) {
								v = _impress.get(propsData.dataOwner, ...propsData.dataPathArray);
							}
						}
						argsToData.push(v);
					}
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

	for (let i = 1, propPath; (propPath = propsPathArray[i]) !== undefined; i++) {
		if (dataPathArray == undefined) propsName = `${propsName}.${propPath}`;
		else dataPathArray.push(propPath);

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
	if (pathString == undefined) {
		let dataKeys = Object.keys(currentComponent._observables);
		for (let dataKey of dataKeys) {
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
 * TODO??
 * @param {Object} iObject
 */
/*_impress.refreshAll = function (iObject) {
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
};*/

/**
 * @private
 * @description
 * refresh screen data for single component
 * first load - (used when dynamically adding component)
 * @param {Object} currentComponent
 */
_impress.refreshComponent = function (currentComponent) {
	let iObject = impressObjects[currentComponent.name];
	let pathStrings = Object.keys(iObject._textData);

	for (let pathString of pathStrings) {
		if (pathString.indexOf('props.') === 0) {
			//set all props in the template, must be done at component level, albeit it could be cacheable???
			let propsData = _impress.propsToDataNamespaceConversion(currentComponent, pathString);
			let value = _impress.get(propsData.dataOwner, ...propsData.dataPathArray);

			for (let id of iObject._textData[pathString]) {
				let textNode = currentComponent.iNode.querySelector(`[i-data="${id}"]`);

				textNode.textContent = value;
			}
		} else if (currentComponent.isMounted === true) {
			//only refresh data for mounted components as it set in the template for new components
			let dataPathArray = pathString.match(/[^\[\]\.\{\}]+/g);
			let value = _impress.get(currentComponent, ...dataPathArray);

			for (let id of iObject._textData[pathString]) {
				let textNode = currentComponent.iNode.querySelector(`[i-data="${id}"]`);

				textNode.textContent = value;
			}
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

	for (let i = observerNames.length - 1, observerName; (observerName = observerNames[i]) !== undefined; i--) {
		//observerName will not equal pathSting when a whole object has been modified
		if (observerName != pathString) dataPathArray = observerName.split('.');

		let i = dataOwner._observables[observerName].target.length;
		let value = _impress.get(dataOwner, ...dataPathArray);

		while (i--) {
			let component = dataOwner._observables[observerName].target[i];
			let dataName = dataOwner._observables[observerName].dataName[i];
			let iObject = impressObjects[component.name];
			_impress.refreshTextNodes(component, dataName, value);
			_impress.refreshAttribute(component, dataName, value);

			if (typeof iObject.methods.afterUpdated === 'function') iObject.methods.afterUpdated(component, dataName);
		}
	}
};

/**
 * @public
 * @description
 * refreshes all the text nodes of local dataName mapped to the data owner state change
 * @param {Objec} component
 * @param {String} dataName
 * @param {*} value
 */
_impress.refreshTextNodes = (component, dataName, value) => {
	let iObject = impressObjects[component.name];

	if (iObject._textData[dataName] != undefined) {
		for (let id of iObject._textData[dataName]) {
			let textNode = component.iNode.querySelector(`[i-data="${id}"]`);

			textNode.textContent = value;
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
_impress.refreshAttribute = (currentComponent, attrValue, value) => {
	let attributes = impressObjects[currentComponent.name]._attributes;

	for (let i = 0, iLen = attributes.length; i < iLen; i++) {
		let vAttributeArray = impressAttributes[attributes[i]].filter((v) => v.attributeValue === attrValue);

		for (let attribute of vAttributeArray) {
			//lookup props or data from the relevant observable to the attribute

			if (attrValue.indexOf('props.') === 0 || attrValue.indexOf('data.') === 0) {
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
	let currentComponentNames = Object.keys(impressObjects);
	let skipComponentCount = 0;

	let wrapInSpan = function (match) {
		let _iGuid = _impress.newGUID();
		let name = match.substring(1, match.length - 1);
		if (iObject._textData[name] == undefined) iObject._textData[name] = [];
		iObject._textData[name].push(_iGuid);
		if (name.indexOf('data.') === 0) {
			//data is substituted in the object definition
			let dataPathArray = name.match(/[^\[\]\.\{\}]+/g);
			let value = _impress.get(data, ...dataPathArray);

			return `<span i-data="${_iGuid}">${value}</span>`;
		} else {
			//props cannot be substituted until the propsMap is made
			return `<span i-data="${_iGuid}">${match}</span>`;
		}
	};

	let isComponent = function (tagLine, componentNamesArray, isEndTag = false) {
		for (let componentName of componentNamesArray) {
			if (isEndTag === false && tagLine.indexOf(`<${componentName}`) === 0) return true;
			if (isEndTag === true && tagLine.indexOf(`</${componentName}`) === 0) return true;
		}
		return false;
	};

	tempLines = template.match(/(<[^>]+)>|[^<>]+/g);

	for (let i = 0, tLen = tempLines.length; i < tLen; i++) {
		let v = tempLines[i];

		//skip child component content
		if (skipComponentCount > 0) continue;

		if (v[0] === '<') {
			//tag line - first exclude any component tags within a parent template - those are handled by the child
			if (isComponent(v, currentComponentNames) === true) {
				skipComponentCount++;
				if (v.includes('/>')) skipComponentCount--;
				continue;
			} else if (isComponent(v, currentComponentNames, true)) {
				skipComponentCount--;
				continue;
			}
			//identify tags with attributes containing data/props/i-events
			if (v.includes('{props.') || v.includes('{data.') || v.includes('i-event')) {
				let tag = v.match(/<[^\s]+/);
				tag = tag[0].slice(1);
				//test tagline for attribute match, get new GUID if present, remove attributes from tagline and add to impressAttributes{[]}
				let attr = v.match(/[a-z-]+={[^}]+}/g);

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
	constructor(name, template = '', data = {}, methods = {}) {
		this.name = name;
		this.data = data;
		this.methods = methods;
		this._attributes = [];
		this._textData = {};
		if (template !== '') {
			this.template = _impress.correctHtml(template);
			this.template = _impress.iAttributesHtml(this);
		} else {
			this.template = template;
		}
		this.templateNode = document.createElement('template');
		this.templateNode.innerHTML = this.template;
	}
}

class IMPRESSCOMPONENT {
	constructor(iNode) {
		let iObject = impressObjects[iNode.localName];
		this.iGuid = _impress.newGUID();
		this.iNode = iNode;
		this.name = iNode.localName;
		this.iChildren = [];
		this.iRoot = this.iParent == undefined ? this : this.iParent.iRoot;
		this.data = typeof iObject.data === 'function' ? iObject.data() : _impress.deepClone(iObject.data);
		this.isMounted = false;
		//make below private?
		this._iEventNodes = [];
		this._iEventListener = [];
		this._propsMaps = {};
		this._observables = {};
		this._dataMaps = {};
		impressComponents[this.iGuid] = this;
		this.iNode.setAttribute('i-guid', this.iGuid);
		this.iParent = _impress.findParentComponentByNode(this.iNode);
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

//IN-BUILT COMPONENTS

//I-FOR
let iForMethods = {
	beforeCreate: ($c) => {
		$c.iNode.innerHTML = '';
	},
	afterMounted: ($c) => {
		let props = $c.getProps();

		let propsKeys = Object.keys($c._propsMaps);
		$c.data.propsPassThroughs = [];
		for (let propsKey of propsKeys) {
			if (propsKey !== 'props.component' && propsKey !== 'props.iterator') {
				$c.data.propsPassThroughs.push(`${propsKey.replace('props.', '')}={${propsKey}}`);
			}
		}
		$c.data.propsPassThroughs = $c.data.propsPassThroughs.join(' ');
		if (props.component == undefined) $c.data.componentName = $c.iNode.getAttribute('component');
		else $c.data.componentName = props.component;
		_iFor.methods.iForChildrenRefresh($c, props.iterator, $c.data.componentName);
	},
	childMoved: ($c, $child) => {
		if ($child.name !== $c.data.componentName || $child.iNode.parentNode !== $c.iNode) {
			//delete external children appended in or appended out of an i-for
			IMPRESS.destroyComponent($child);
		} else {
			//document.querySelector('i-for').appendChild(document.querySelector('i-child'));
			let childNodes = Array.from($c.iNode.querySelectorAll($c.data.componentName));
			let fromIndex = $c.iChildren.indexOf($child);
			let toIndex = childNodes.indexOf($child.iNode);
			let iteratorData = _impress.get($c._propsMaps['props.iterator'].dataOwner, ...$c._propsMaps['props.iterator'].dataPathArray);

			iteratorData.splice(toIndex, 0, ...iteratorData.splice(fromIndex, 1));
			$c.iChildren.splice(toIndex, 0, ...$c.iChildren.splice(fromIndex, 1));
			//correct the _propsMaps and dataOwner _observables based on appended order
			for (let i = 0, iChild; (iChild = $c.iChildren[i]) !== undefined; i++) {
				let propsMap = iChild._propsMaps['props.item'];
				let dataPath = propsMap.dataPath;
				let targetIndex = propsMap.dataOwner._observables[propsMap.dataPath].target.indexOf(iChild);
				//remove existing observable
				propsMap.dataOwner._observables[dataPath].target.splice(targetIndex, 1);
				propsMap.dataOwner._observables[dataPath].dataName.splice(targetIndex, 1);
				//construct new data path and push new observable
				propsMap.dataPathArray[propsMap.dataPathArray.length - 1] = i;
				propsMap.dataPath = propsMap.dataPathArray.join('.');
				propsMap.dataOwner._observables[propsMap.dataPath].target.push(iChild);
				propsMap.dataOwner._observables[propsMap.dataPath].dataName.push('props.item');
			}
		}
	},
	afterUpdated: ($c, dataPath) => {
		switch (dataPath) {
			case 'props.iterator':
				let iterator = $c.getProps('props.iterator');
				_iFor.methods.iForChildrenRefresh($c, iterator, $c.data.componentName);
				break;
		}
	},
	iForChildrenRefresh: ($c, iterator, componentName) => {
		if ($c.iChildren.length === iterator.length) {
			return;
		} else if ($c.iChildren.length < iterator.length) {
			let html = '';
			for (let i = $c.iChildren.length, item; (item = iterator[i]) !== undefined; i++) {
				html += `<${componentName} item={props.iterator[${i}]} ${$c.data.propsPassThroughs}></${componentName}>`;
			}
			$c.iNode.insertAdjacentHTML('beforeend', html);
		} else {
			for (let i = $c.iChildren.length - 1; i >= iterator.length; i--) {
				IMPRESS.destroyComponent($c.iChildren[i]);
			}
		}
	}
};
const _iFor = IMPRESS.create('i-for', undefined, undefined, iForMethods);
//I-FOR
