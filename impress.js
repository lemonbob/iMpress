export {IMPRESS as default}

'use strict'
////////////////////////////////////////////////////////////////////////////////
//Definition module

//PUBLIC
var IMPRESS = {}
IMPRESS.create = function(name){
  name = name.toLowerCase();
  console.log("Created: " + name);
  if (impressObjects[name] === undefined){
    impressObjects[name] = new IMPRESSOBJECT(name);
    //Callbacks to define HTML custom Element
    customElements.define(name, class extends HTMLElement{
      constructor(){
        super();
        this.classList.add("i-style");
        impress.addComponent(this);
      }
      //Callback when components gets added to the DOM - "connected"
      connectedCallback(){
      }
      disconnectedCallback(){
        impress.removeComponent(this);
      }
    });
    return impressObjects[name];
  }
  else {console.log(`iMpress error ---  "${name}" impressComponent is already defined! Check modules for naming conflict`);throw "Component duplication error"; }
}


IMPRESS.destroy = function(name){
  if (impressObjects[name] !== undefined){
    for (let i=0;i<impressComponents[name].length;i++){
      let parentNode = impressComponents[name][i].iNode.parentNode;
      parentNode.removeChild(impressComponents[name][i].iNode);
    }
    delete impressObjects[name];
  }
}


//PRIVATE/////////////////////////////////////////////////////////////////////
//Impress implementation methods
var impress = {};
var guID = 0;

//CONSTRUCTOR METHODS
impress.addComponent = function(thisNode){
  let name = thisNode.localName;
  //add the component to impressComponents array.
  if (impressComponents[name] === undefined){impressComponents[name] = [];}
  let parentNode = impress.findParent(thisNode);
  let parentComponent = impress.findParentComponent(parentNode);
  impressComponents[name].push(new IMPRESSCOMPONENT(thisNode, parentNode, parentComponent));
  let currentComponent = impressComponents[name][impressComponents[name].length-1];
  if (parentComponent !== undefined){
    parentComponent.iChildren.push(currentComponent);
    if (parentComponent.hasMounted === true){
      impress.mountComponent(currentComponent);
    }
  }
}


impress.mountComponent = function(currentComponent){
  //console.log(`PARENT "hasMounted" TRUE. ${currentComponent.name} innerHTML added immediately!`);
  currentComponent.iNode.innerHTML = impressObjects[currentComponent.name].template;
  impress.setiProps(currentComponent);
  impress.setiData(currentComponent);
  impress.setiAttributes(currentComponent);
  impress.setiEvents(currentComponent);
  currentComponent.hasMounted = true;
  impress.refreshComponent(currentComponent);
  for (let n=0; n<currentComponent.iChildren.length;n++){
   impress.mountComponent(currentComponent.iChildren[n]);
 }
}



impress.findParent = function(thisNode){
  let parentNode = thisNode.parentNode;
  let parentName = parentNode.localName;
  while (parentNode.localName !== "body" && impressComponents[parentName] === undefined){
    parentNode = parentNode.parentNode;
    parentName = parentNode.localName;
  }
  if (parentName !== "body"){return parentNode}
    else {return undefined}
  }



impress.findParentComponent = function(parentNode){
  if (parentNode !== undefined){
    let parentIndex = impressComponents[parentNode.localName].findIndex((v)=>v.iNode===parentNode);
    return impressComponents[parentNode.localName][parentIndex];
  }
  else{
    return undefined;
  }
}

////////////////////////////////////////////////////////////////////////////////
//DESTRUCTOR METHODS

impress.removeComponent = function(thisNode){
  let name = thisNode.localName;
  let index = impressComponents[name].findIndex((v)=>v.iNode===thisNode);
  let currentComponent = impressComponents[name][index];
  //console.log("DISCONNECTED impressComponent: " + name + " index: " + index);
  //remove observable references in parent iObject for props and data
  for (let propName in currentComponent.propsTargets){
    let dataName = currentComponent.propsTargets[propName].keyString;
    let observableIndex = currentComponent.propsTargets[propName].dataOwner.observables[dataName].target.indexOf(currentComponent); 
    currentComponent.propsTargets[propName].dataOwner.observables[dataName].target[observableIndex] = null;
    currentComponent.propsTargets[propName].dataOwner.observables[dataName].target.splice(observableIndex, 1);
    currentComponent.propsTargets[propName].dataOwner.observables[dataName].dataName.splice(observableIndex, 1);
    currentComponent.propsTargets[propName].dataOwner = null;
    currentComponent.propsTargets[propName].target = null;
    currentComponent.propsTargets[propName].replaceNode = null;
    currentComponent.propsTargets[propName].keyString = null;
    delete currentComponent.propsTargets[propName].dataOwner;
    delete currentComponent.propsTargets[propName].target;
    delete currentComponent.propsTargets[propName].replaceNode;
    delete currentComponent.propsTargets[propName].keyString;
  }  
  for (let dataName in currentComponent.dataTargets){
    while(currentComponent.dataTargets[dataName].replaceNode.length>0){
      currentComponent.dataTargets[dataName].replaceNode.pop();
      currentComponent.dataTargets[dataName].target.pop();
    }
    delete currentComponent.dataTargets[dataName].replaceNode;
    delete currentComponent.dataTargets[dataName].targets;
    let observableIndex = impressObjects[name].observables[dataName].target.indexOf(currentComponent);
    impressObjects[name].observables[dataName].target[observableIndex] = null;
    impressObjects[name].observables[dataName].target.splice(observableIndex, 1);
    impressObjects[name].observables[dataName].dataName.splice(observableIndex, 1);
  }
  for (let index = 0;index<currentComponent.iEventNodes.length;index++){
    currentComponent.iEventNodes[index].removeEventListener(currentComponent.iEventListener[index].listener,currentComponent.iEventListener[index]);
    currentComponent.iEventNodes[index] = null;
    currentComponent.iEventListener[index].listener = null;
    currentComponent.iEventListener[index].handleEvent = null; 
  }
  currentComponent.dataTargets = null;
  currentComponent.hasMounted = null;
  currentComponent.iChildren = null;
  currentComponent.iEventNodes = null;
  currentComponent.iNode = null;
  currentComponent.props = null;
  currentComponent.propsTargets = null;
  currentComponent.iParent = null;
  currentComponent.iParentNode = null;
  currentComponent.name = null;
  delete currentComponent.dataTargets;
  delete currentComponent.hasMounted;
  delete currentComponent.iChildren;
  delete currentComponent.iEventNodes;
  delete currentComponent.iNode;
  delete currentComponent.props;
  delete currentComponent.propsTargets;
  delete currentComponent.iParent;
  delete currentComponent.iParentNode;
  delete currentComponent.name;
  impressComponents[name].splice(index,1);
  if (impressComponents[name].length === 0){delete impressComponents[name]}
  //console.log(impressComponents);
  //console.log(impressObjects);
}

////////////////////////////////////////////////////////////////////////////////
//DATA OBSERVER FUNCTIONS

impress.setiAttributes = function(currentComponent){
  //console.log("SET ATTRIBUTES");
  let attrNodes = currentComponent.iNode.querySelectorAll("*[i-attribute]");
  for (let index=0; index<attrNodes.length;index++){ 
    let iAttrIndex = attrNodes[index].getAttribute("i-attribute");
    impressAttributes[iAttrIndex].forEach((v)=>{
      let value;
      if (v.attributeValue.indexOf("props.") === 0){
        value = currentComponent.propsTargets[v.attributeValue].dataOwner.observables[currentComponent.propsTargets[v.attributeValue].keyString].value
      }
      else if (attrValue.indexOf("data.") === 0){
        value = impressObjects[currentComponent.name].observables[attrValue].value;
      }
      attrNodes[index].setAttribute(v.attributeName, value);
    });
  }
}


impress.setiData = function(currentComponent){
  let name = currentComponent.name;
  let iObject = impressObjects[name];
  let n, iDataValue, iDataDuplicates, iTextNodes = [];
  let treeWalker = document.createNodeIterator(currentComponent.iNode, NodeFilter.SHOW_TEXT, (node)=>{return (node.nodeValue.includes("{data.")) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;});

  while(n = treeWalker.nextNode()){iTextNodes.push(n);}
  for (let i=0;i<iTextNodes.length;i++){
    iDataDuplicates = [];
    iDataValue = iTextNodes[i].nodeValue.match(/(data\.)[^\}\s]+/g);
    //Add Observer for data match, avoid duplicates in same node as Observer algoritm replaces all data in any given node
    for (let n=0;n<iDataValue.length;n++){
      if (iDataDuplicates.indexOf(iDataValue[n]) === -1){
        iDataDuplicates.push(iDataValue[n]);
        let objPath = impress.objectPath(iObject, iDataValue[n], "object");
        if (!objPath.dataObject[objPath.dataProperty]){console.log(`iMpress error ---  <${iObject.name} > --- impress module specifies data in template at:\n\n"${iTextNodes[i].outerHTML}"\n\ni-data attribute "${iDataValue[n]}" does not match data!`);throw "data error";}
        impress.createDataObserver(currentComponent, iTextNodes[i], objPath, iDataValue[n]);
      }
    }
  }
}


impress.createDataObserver = function(currentComponent, target, objPath, keyString){
  let name = currentComponent.name;
  let iObject = impressObjects[name];

  if(!currentComponent.dataTargets[keyString]){
    currentComponent.dataTargets[keyString] = {};
    currentComponent.dataTargets[keyString].target = [];
    currentComponent.dataTargets[keyString].replaceNode = [];
  }
  if (!iObject.observables[keyString]){
    iObject.observables[keyString] = {};
    iObject.observables[keyString].target = [];
    iObject.observables[keyString].dataName = [];
    iObject.observables[keyString].value = objPath.dataObject[objPath.dataProperty];
    Object.defineProperty(objPath.dataObject, objPath.dataProperty,{
      get:()=>{return iObject.observables[keyString].value},
      set:(v)=>{iObject.observables[keyString].value = v;impress.refreshData(iObject, keyString);}
    });
  }
  let slicedText = target.nodeValue.match(/(\{data|\{props)[^\}]+.|.[^\{\}]*/g);
  if (!iObject.observables[keyString].target.includes(currentComponent)){
    iObject.observables[keyString].target.push(currentComponent);
    iObject.observables[keyString].dataName.push(keyString);
  }
  currentComponent.dataTargets[keyString].target.push(target);
  currentComponent.dataTargets[keyString].replaceNode.push(slicedText);
}



impress.setiProps = function(currentComponent){
  let keyString;
  let attributes = currentComponent.iNode.attributes;
  let parentComponent = currentComponent.iParent;
  if (parentComponent !== undefined){
    for (let i=0;i<attributes.length;i++){
      //restrict searched attributes to ones with {data.xxx} or {props.xxx}. You can pass props by "prop drilling".
      if (attributes[i].value.indexOf("{data.") === 0 || attributes[i].value.indexOf("{props.") === 0){
        let attrName = attributes[i].name;
        let propsName = "props." + attributes[i].name;
        //create propsTargets object if it doesn't exist
        if (!currentComponent.propsTargets[propsName]){currentComponent.propsTargets[propsName] = {};}
        //if props have been passed down, i.e. prop drilling, use parent propsTargets
        if (attributes[i].value.indexOf("{props.") === 0){
          currentComponent.propsTargets[propsName].keyString = currentComponent.iParent.propsTargets[propsName].keyString;
          currentComponent.propsTargets[propsName].dataOwner = currentComponent.iParent.propsTargets[propsName].dataOwner;
          currentComponent.propsTargets[propsName].target = [];
          currentComponent.propsTargets[propsName].replaceNode = [];
        }
        else{
          keyString = attributes[i].value.replace(/\{|\}/g,"");  
          let iObject = impressObjects[parentComponent.name];
          let objPath = impress.objectPath(iObject, keyString, "object");
          if (objPath.dataObject[objPath.dataProperty]){
            //if the iObject data isn't already an observable, make it one. 
            if (!iObject.observables[keyString]){
              iObject.observables[keyString] = {};
              iObject.observables[keyString].target = [];
              iObject.observables[keyString].dataName = [];
              iObject.observables[keyString].value = objPath.dataObject[objPath.dataProperty];
            }
            currentComponent.propsTargets[propsName].keyString = keyString;
            currentComponent.propsTargets[propsName].dataOwner = impressObjects[parentComponent.name];
            currentComponent.propsTargets[propsName].target = [];
            currentComponent.propsTargets[propsName].replaceNode = [];
          }
          else{console.log(`iMpress error ---  "${parentComponent.name}" impressComponent passed props to "${currentComponent.name}"\nValue ${attributes[i].name}=${attributes[i].value} not defined in data!`);throw "data error";}
        }
        Object.defineProperty(currentComponent.props, attributes[i].name, {
          configurable:true,
          get:()=>{return currentComponent.propsTargets[propsName].dataOwner.observables[currentComponent.propsTargets[propsName].keyString].value},
          set:(v)=>{currentComponent.propsTargets[propsName].dataOwner.observables[currentComponent.propsTargets[propsName].keyString].value = v}
        });
      }
    }
    //create the tree walker and add the props nodes
    let n, iDataValue, iDataDuplicates, iTextNodes = [];
    let treeWalker = document.createNodeIterator(currentComponent.iNode, NodeFilter.SHOW_TEXT, (node)=>{return (node.nodeValue.includes("{props.")) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;});
    while(n = treeWalker.nextNode()){iTextNodes.push(n);}
    if (iTextNodes.length>0){
      for (let i=0;i<iTextNodes.length;i++){
        iDataDuplicates = [];
        iDataValue = iTextNodes[i].nodeValue.match(/(props\.)[^\}\s]+/g);
        //Add Observer for data match, avoid duplicates in same node as Observer algoritm replaces all data in any given node
        for (let n=0;n<iDataValue.length;n++){
          if (iDataDuplicates.indexOf(iDataValue[n]) === -1){
            iDataDuplicates.push(iDataValue[n]);
            let objPath = impress.objectPath(currentComponent, iDataValue[n], "object");
            if (!objPath.dataObject[objPath.dataProperty]){console.log(`iMpress error ---  <${currentComponent.name} > --- impress module specifies data in template at:\n\n"${iTextNodes[i].nodeValue}"\n\ni-data attribute "${iDataValue[n]}" does not exist!`);throw "data error";}
            impress.createPropsObserver(currentComponent, iTextNodes[i], objPath, iDataValue[n]);
          }
        }
      }
    }
  }
}



impress.createPropsObserver = function(currentComponent, target, objPath, propsName){
  let name = currentComponent.name;
  let iObject = currentComponent.propsTargets[propsName].dataOwner;
  let keyString = currentComponent.propsTargets[propsName].keyString;
  //create the getter and setter for props.xxx.xxx path in currentComponent
  Object.defineProperty(objPath.dataObject, objPath.dataProperty,{
    get:()=>{return currentComponent.propsTargets[propsName].dataOwner.observables[currentComponent.propsTargets[propsName].keyString].value},
    set:(v)=>{currentComponent.propsTargets[propsName].dataOwner.observables[currentComponent.propsTargets[propsName].keyString].value = v;}
  });
  let slicedText = target.nodeValue.match(/(\{data|\{props)[^\}]+.|.[^\{\}]*/g);
  currentComponent.propsTargets[propsName].target.push(target);
  currentComponent.propsTargets[propsName].replaceNode.push(slicedText);
  //push the component and name into data owner object observable
  iObject.observables[keyString].target.push(currentComponent);
  iObject.observables[keyString].dataName.push(propsName);
}


////////////////////////////////////////////////////////////////////////////////
//UPDATE STATE//
//var impressObserverTargets = [];

impress.replaceNodeText = function(currentComponent, slicedText){
  return slicedText.reduce((t,c)=>{
    if (c.indexOf("{data.") === 0){c = c.substring(1, c.length-1);t = t + impressObjects[currentComponent.name].observables[c].value}
    else if (c.indexOf("{props.") === 0){c = c.substring(1, c.length-1);t = t + currentComponent.propsTargets[c].dataOwner.observables[currentComponent.propsTargets[c].keyString].value}//currentComponent.propsTargets[c].parentObject[currentComponent.propsTargets[c].parentProperty]}
    else{t += c}
      return t;
  }, "");

}


//refresh screen data for all components of impressObject type (used at initial load)
impress.refreshAll = function(iObject){
  let impressObserverTargets = [];
  let observerTarget;
  
  for (let keyString in iObject.observables){
    for (let i=0;i<iObject.observables[keyString].target.length;i++){      
    //if (iObject.observables[keyString].target[i].constructor.name === "IMPRESSCOMPONENT"){
      observerTarget = undefined; 
      if (iObject.observables[keyString].dataName[i].indexOf("props.") === 0){ 
        observerTarget = iObject.observables[keyString].target[i].propsTargets[iObject.observables[keyString].dataName[i]];
      }
      if (iObject.observables[keyString].dataName[i].indexOf("data.") === 0){ 
        observerTarget = iObject.observables[keyString].target[i].dataTargets[iObject.observables[keyString].dataName[i]];
      }
      if (observerTarget){
        for (let n=0; n<observerTarget.target.length;n++){
          if (impressObserverTargets.indexOf(observerTarget.target[n]) === -1){
            observerTarget.target[n].nodeValue = impress.replaceNodeText(iObject.observables[keyString].target[i], observerTarget.replaceNode[n]);
            impressObserverTargets.push(observerTarget.target[n]);
          }
        }
      }
    }
  }
}


//refresh screen data for single component (used when dynamically adding component)
impress.refreshComponent = function(currentComponent){
  let impressObserverTargets = [];
  for (let propName in currentComponent.propsTargets){
    for (let n = 0; n<currentComponent.propsTargets[propName].target.length;n++){
      if (impressObserverTargets.indexOf(currentComponent.propsTargets[propName].target[n]) === -1){
        currentComponent.propsTargets[propName].target[n].nodeValue = impress.replaceNodeText(currentComponent, currentComponent.propsTargets[propName].replaceNode[n]);
        impressObserverTargets.push(currentComponent.propsTargets[propName].target[n]); 
      }
    }
  }
  for (let dataName in currentComponent.dataTargets){
    for (let n = 0; n<currentComponent.dataTargets[dataName].target.length;n++){
      if (impressObserverTargets.indexOf(currentComponent.dataTargets[dataName].target[n]) === -1){
        currentComponent.dataTargets[dataName].target[n].nodeValue = impress.replaceNodeText(currentComponent, currentComponent.dataTargets[dataName].replaceNode[n]);
        impressObserverTargets.push(currentComponent.dataTargets[dataName].target[n]); 
      }
    }
  }
  impressObserverTargets = null;
}


//refresh data based on data keyString
impress.refreshData = function(iObject, keyString){
  let impressObserverTargets = [];
  let observerTarget;

  for (let i=0;i<iObject.observables[keyString].target.length;i++){
    if (iObject.observables[keyString].dataName[i].indexOf("props.") === 0){ 
      observerTarget = iObject.observables[keyString].target[i].propsTargets[iObject.observables[keyString].dataName[i]];
    }
    else if (iObject.observables[keyString].dataName[i].indexOf("data.") === 0){ 
      observerTarget = iObject.observables[keyString].target[i].dataTargets[iObject.observables[keyString].dataName[i]];
    }
    impress.refreshAttribute(iObject.observables[keyString].target[i], iObject.observables[keyString].dataName[i]);
    if (observerTarget){
      for (let n=0; n<observerTarget.target.length;n++){
        if (impressObserverTargets.indexOf(observerTarget.target[n]) === -1){
          observerTarget.target[n].nodeValue = impress.replaceNodeText(iObject.observables[keyString].target[i], observerTarget.replaceNode[n]);
          impressObserverTargets.push(observerTarget.target[n]);
        }
      }
    }
  }
}


impress.refreshAttribute = function(currentComponent, attrValue){
  let attrNodes = currentComponent.iNode.querySelectorAll("*[i-attribute]");
  let impressAttributeTargets = [];

  for (let index=0; index<attrNodes.length;index++){ 
    let iAttrIndex = attrNodes[index].getAttribute("i-attribute");
    let value;
    impressAttributes[iAttrIndex].forEach((v)=>{
      if (v.attributeValue === attrValue){
        if (attrValue.indexOf("props.") === 0){
          //value = currentComponent.propsTargets[v.attributeValue].parentObject[currentComponent.propsTargets[v.attributeValue].parentProperty];
          value = currentComponent.propsTargets[v.attributeValue].dataOwner.observables[currentComponent.propsTargets[v.attributeValue].keyString].value;
        }
        else if (attrValue.indexOf("data.") === 0){
          value = impressObjects[currentComponent.name].observables[attrValue].value;
        }
        attrNodes[index].setAttribute(v.attributeName, value);
      }
    });
  }
}


////////////////////////////////////////////////////////////////////////////////
//IEVENTS//
//setiEvents on template object
impress.handleEvent = function(iEventObject, argumentArray){
  let argsToData = argumentArray.map((v) => {
    if (v==="$e"||v==="$event"){v = iEventObject;}
    else if (v==="$parent"){v = currentComponent.iParent;}
    else if (v==="$component"){v = currentComponent;}
    else if (impressObjects[currentComponent.name].data[v] !== undefined){v = impressObjects[currentComponent.name].data[v];}
    return v;
  });
  impressObjects[currentComponent.name].methods[fCall](...argsToData);
}



impress.setiEvents = function(currentComponent){
  currentComponent.iEventNodes = currentComponent.iNode.querySelectorAll("[i-event]");
  currentComponent.iEventNodes = Array.from(currentComponent.iEventNodes);
  //remove any i-event attributes contained in impressObject tags (iNode child tags)
  currentComponent.iEventNodes.forEach((v,i,a)=>{ 
    if (impressObjects[v.localName]){a.splice(i,1)}
  });
  //add event attribute if iNode own tag has i-event attribute set (query Selector will not find iNode own attributes)
  if (currentComponent.iNode.hasAttribute("i-event")){
    //console.log("ADDING PARENT TAG EVENT" + currentComponent.iNode.getAttribute("i-event"));
    currentComponent.iEventNodes.push(currentComponent.iNode);
    //console.log(currentComponent.iEventNodes);
  }
  currentComponent.iEventListener = new Array(currentComponent.iEventNodes.length);
  //if (currentComponent.iEventNodes.length !== 0){
    for (let index=0; index<currentComponent.iEventNodes.length;index++){
      let jsonData = currentComponent.iEventNodes[index].getAttribute("i-event");
      jsonData = jsonData.replace(/ /g,"");
      jsonData = JSON.parse(jsonData);
      for (let jsonKey in jsonData){
        let argumentArray = jsonData[jsonKey];
        //destructure the string, remove empty brackets, convert first bracket to "," if contains arguments, remove second bracket, split to CSV
        argumentArray = argumentArray.replace("()","").replace("(",",").replace(")","").split(",");
        let listener = jsonKey;
        //splice off the method leaving just the arguments
        let fCall = argumentArray[0];argumentArray.splice(0,1);
        //add the listener if defined, and call the listener with the arguments once converted from strings into data object of data[argumentArray[index]]
        if (listener !== undefined){
         //check if method is impressObjects prototype method
         if (impressObjects[currentComponent.name][fCall]){
          currentComponent.iEventNodes[index].addEventListener(listener,() => {currentComponent[fCall](...argumentArray)});
        }
        //check if method is iObject custom method
        else if (impressObjects[currentComponent.name].methods[fCall] !== undefined){
          currentComponent.iEventListener[index] = {};  
          currentComponent.iEventListener[index].listener = listener;  
          //currentComponent.iEventListener[index].handleEvent = (iEventObject)=>{impress.handleEvent(iEventObject, argumentArray)};        
          currentComponent.iEventListener[index].handleEvent = (iEventObject)=>{
            let argsToData = argumentArray.map((v) => {
              if (v==="$e"||v==="$event"){v = iEventObject;}
              else if (v==="$parent"){v = currentComponent.iParent;}
              else if (v==="$component"){v = currentComponent;}
              else if (impressObjects[currentComponent.name].data[v] !== undefined){v = impressObjects[currentComponent.name].data[v];}
              return v;
            });
            impressObjects[currentComponent.name].methods[fCall](...argsToData);
          }
          currentComponent.iEventNodes[index].addEventListener(currentComponent.iEventListener[index].listener,currentComponent.iEventListener[index]);
        }
        else{console.log(`iMpress warning ---  i-event "${listener}" method ${fCall}() is undefined in "${currentComponent.name}"`);}
      }
      else{console.log(`iMpress error --- no listener on i-event object at:\n${currentComponent.name}\ni-event attribute only accepts correctly formatted JSON string data\nwhere "key":"value" pairs correspond to listener and module method respectively`);throw "i-event error";}
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
//HELPER FUNCTIONS — conversion of template strings to Objects

//get Object and Property value from keyString path 
impress.objectPath = function(object, str, method){
  let strArray = str.match(/[^\[\]\.\{\}]+/g);
  let final = strArray.pop();
  while (strArray.length>0){
    if (object[strArray[0]]){
      object = object[strArray[0]];
      strArray.shift();
    }
    else {object=undefined};
  }
  if (method === "object"){return {dataObject:object, dataProperty:final};}
  return object[final];
}


//clone object and value from keyString path
impress.cloneObjectFromPath = function(source, dest, str){
  let strArray = str.match(/[^\[\]\.\{\}]+/g);
  let final = strArray.pop();
  while (strArray.length>0){
    if (source[strArray[0]]){
      if (!dest[strArray[0]]){dest[strArray[0]] = {};}
      source = source[strArray[0]];
      dest = dest[strArray[0]];
      strArray.shift();
    }
    else {source=undefined};
  }
  Object.defineProperty(dest, final,{
    get:()=>{return source[final]},
    set:(v)=>{source[final] = v;}
  });
}


//Generate a new unique indentifier
impress.newGUID = function(){
  guID++;
  return guID;
}


//Remove newline/return and extraneous spaces, including trimming spaces from datamatches
impress.correctHtml = function(template){
  if (template){
    template = template.replace(/[\r\n]/g, " ");
    template = template.replace(/\>\s+(?=<)/g, ">");
    template = template.replace(/<\s+/g, "<");
    template = template.trim();

    let dataMatches = template.match(/[^\{]+?(?=})/g);
    if (dataMatches){
      for (let i=0;i<dataMatches.length;i++){
        let correctedData = dataMatches[i].trim();
        template.replace(`{${dataMatches[i]}}`, `{${correctedData}}`);
      }
    }
    return template;
  }
}


impress.iAttributesHtml = function(template){
  //let name = currentComponent.name;
  //let iObject = impressObjects[name];
  let n, iAttributeNodes = [];
  let tempLines;
  let nameValue = [];
  //console.log("SET ATTRIBUTES");
  tempLines = template.match(/(<[^>]+)>|[^<>]+/g);
  tempLines.forEach((v,i,a)=>{
    if (v[0] === "<" && (v.includes("{props.") || v.includes("{data."))){
      let tag = v.match(/<[^\s]+/);
      tag = tag[0].slice(1);
      //test tagline for attribute match, get new GUID if present, remove attributes from tagline and add to impressAttributes{[]}
      let attr = v.match(/[^\s]+(?=})}/g);
      if (attr !== null && !impressObjects[tag]){
        let guID = impress.newGUID();
        impressAttributes[guID] = [];
        attr.forEach((vAttr)=>{
          let nameValueArray = vAttr.split("=");
          nameValueArray[1] = nameValueArray[1].substring(1,nameValueArray[1].length-1);
          impressAttributes[guID].push({attributeName:nameValueArray[0], attributeValue:nameValueArray[1]});
          v = v.replace(attr,"");
        });
        if (v.match(/[/](?=>)/) === null){
          a[i] = v.replace(">", ` i-attribute="${guID}">`);
        }
        else a[i] = v.replace("/", ` i-attribute="${guID}"/`);
      }
    }
    //data-tag matches experimental
    /*
    else {
      if (v.includes("{props.") || v.includes("{data.")){
        let attr = v.match(/[^\s]+(?=})}/g);
        if (attr !== null){
          console.log(attr);
          a[i-1] = a[i-1].replace(">", ` i-data="mike">`);
        }  
      }
    }
    */
  });
  //console.log(tempLines);
  template = tempLines.reduce((t,c)=>t+=c);
  return template;
}

//OBJECTS///////////////////////////////////////////////////////////////////////
//
const impressObjects = {};
const impressComponents = {};
const impressAttributes = {};


const IMPRESSOBJECT = function(name){
  this.name = name;
  this.data = {};
  this.methods = {};
  this.observables = {};
  this._template = "";
  Object.defineProperty(this, 'template', {
    get: () => this._template,
    set: (v) => {
      this._template = v;
      if (impressComponents[this.name] !== undefined){
        v = impress.correctHtml(v);
        v = impress.iAttributesHtml(v); 
        this._template = v;
        for (let i=0;i<impressComponents[this.name].length;i++){
          impressComponents[this.name][i].iNode.innerHTML = this.template;
          impress.setiProps(impressComponents[this.name][i]);
          impress.setiData(impressComponents[this.name][i]);
          impress.setiAttributes(impressComponents[this.name][i]);
          impress.setiEvents(impressComponents[this.name][i]);
          impressComponents[this.name][i].hasMounted = true;
          //add children HTML after main template has been added.
          let addedChildren = [];
          for (let n=0; n<impressComponents[this.name][i].iChildren.length;n++){
            if (addedChildren.indexOf(impressComponents[this.name][i].iChildren[n].name) === -1){
              //console.log(this.name + " ADD LINKED CHILD TEMPLATES");
              //console.log("\n");
              impressObjects[impressComponents[this.name][i].iChildren[n].name].template = impressObjects[impressComponents[this.name][i].iChildren[n].name].template;
              addedChildren.push(impressComponents[this.name][i].iChildren[n].name);
            }
          }
        }
        impress.refreshAll(this);
      }
    }
  });
}


const IMPRESSCOMPONENT = function(iNode, parentNode, parentComponent){
  this.iNode = iNode;
  this.name = iNode.localName;
  this.iParentNode = parentNode;
  this.iParent = parentComponent;
  this.iChildren = [];
  this.props = {};
  this.iEventNodes;
  this.iEventListener;
  this.dataTargets = {};
  this.attributeTargets = {};
  this.propsTargets = {};
  this.hasMounted = false;
}


const iWait = function(time){
  return new Promise((resolve) => setTimeout(()=>resolve(), time));
}


setTimeout(()=>{
  console.log("TEST OUTPUT");
  console.log(impressObjects);
  console.log(impressComponents);
},500);

