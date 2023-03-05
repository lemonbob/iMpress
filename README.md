# iMpress Custom Element Wrapper/Framework

## Introduction

There are many frameworks available for supposedly assisting in web development, some are current, many have fallen from favour. The current most popular frameworks are ReactJS, Angular, VueJS - all of which use a Virtual DOM. Claims circulate the web about the virtues of the Virtual DOM. However, most of the claims are false. Many of the claims centre around avoiding repaints and supposedly batching updates to improve speed. The fact is that modern browsers already batch updates - called the render tree - browsers do this at high speed in native code. The claim that a Javascript difference engine can outperform native code is absurd. Indeed, independent tests have repeatedly shown that Virtual DOM based frameworks slow optimum web performance by a factor up to 100-fold. 

There was a time for these frameworks pre-ES6 (2015) when Javascript lacked performance and lacked unit build tools - modules - but the state of technology has moved on. The Virtual DOM was never a benefit; it was a programming requirement when these frameworks were originally built. It was necessary to capture lifecycle events - create/mount/destroy/update etc - but these events are now native to HTML Custom Elements making a clumsy Virtual DOM obsolete.   

So where does that leave frameworks? Frameworks only have one benefit, state management - supposedly making it easier to maintain the view with the model using a MVVM architecture. However, with project scaling it becomes quickly apparent that MVVM can causes more problems than it solves. State management is actually poorly handled by existing frameworks in anything but the simplest of cases. The "Flux" pattern evolved and Redux/Vuex were added to solve these issues, but caused even more problems. Netflix have gone to great expense to remove frameworks because of poor performance. GitHub removed JQuery and went framework free citing technical debt.

iMpress is different - it is a high-speed lightweight wrapper for HTML Custom Elements. iMpress is a tool for rapid web development built the way frameworks were truly intended - a View layer to be used with whatever data architecture or model, such as MVC, that meets the requirements of the platform. It is upto 1000 times faster than Vue 3, and makes use of HTML Custom Elements in ES6 modules. It is designed to allow the coder to be in control, and allows programmers the freedom to code in a technical debt free environment using modern Javascript. Benefits of iMpress are:

- Uses native support, no Virtual DOM, no more technical debt!
- Data acess upto 400x faster than Vue3.
- Method calls run upto 100x faster than Vue3.
- Component creation upto 180x faster than React/Vue2/Vue3.
- Reactive data updates upto 1000x faster than Vue3 and 10x faster than React
- Memory usage is a fraction of the size of other frameworks, typically 5-10 times smaller.
- Component code length is more concise, upto 20% smaller codebase.
- Props are handled correctly as name spaced representations of data, and are immutable.
- Synchonous code, no more waiting for "nextTick" or components to mount.
- Use async in your life cycle methods, if desired, you are in full control.
- Server-side and dynamic templates, native portals and slots.
- No need for eventbus/emits/context API/sending class props — use the in-built custom query engine.
- NO PROXYS, NO REACTIVE SETTERS (data Vuetation) — data models can be handled externally or using MVC methodology without problems.

In engine terms, ReactJS, Angular, VueJS are steam powered monsters — albeit with large backers — but isn't it time for a more modern approach? Isn't it time we dumped old ideas, such as the Virtual DOM, for lightspeed performance? Instead of new releases such as Vue3 or React 18, some of which are slower than their forebears, the saying, you can't polish coal comes to mind. iMpress is new 3rd generation framework, it has been designed to provide a truly up-to-date solution.

## iMpress


To use - see examples - (also see "i-for" pre-built component)

1. create an ES6 module and import the impress class

2. import {IMPRESS} from "./impress.js";

3. create your impress component as an extension of the IMPRESS class with options for data,mixins, and observers. The only requirement is that your class has a name property. The template is option, but will server as the component's markup. This is reactive, allowing for server side rendering and conditional component rendering. Templates are almost pure 100% valid HTML, unlike Vue2/3 with their pseudo markup and directives or React with it's JSX. (see below for templates).

4. impress takes the template as a template literal string

All components methods are declared on the prototype of the class, including observer and lifecycle methods. All methods can be asynchronous. Asynchronous lifecycle methods will hold up the lifecycle of the component allowing full server side control over component creation and destruction. Observers are registered as an array of reactive data to observe. Slots are supported by HTML custom elements as standard in the shadowDOM (see MDN). Component scoped shadow root css style tags can be dynamic altered avoiding unnecesary bulky class switching and !important overrides.

```
let template = /*html*/`
<link href="css/app.css" rel="stylesheet" type="text/css">
<i-for class="children" let="child" of="{data.children}">
	<i-child class="test-class" child={child}><div>This is a slot</div></i-child>
</i-for>
<style>
* {
	--dynamicCol: {data.col};
}
		
input{
	background-color: var(--dynamicCol);
	color: {data.pen};
}
</style>`
class IAPP extends IMPRESS {
	constructor(node) {
		super(node);
		this.name = 'i-app';
		this.data = {
			children: new Array(10).fill('foo'),
			col: 'red',
			pen: 'blue'
		};
		this.template = template;
	}
	beforeCreate(){
		//called before the component is created
	}
	afterMounted(){
		//called after component mount
	}	
}

export const child = IMPRESS.register(ICHILD);
```

```
let template = /*html*/`<h1 class="my_class">{data.test} examples of data binding {props.child}</h1><slot></slot>`
class ICHILD extends IMPRESS {
	constructor(node) {
		super(node);
		this.name = 'i-child';
		this.data = {
			test: 'BAR'
		};
		this.iDefine('observer', 'props.child.item', 'propsChildObserver');
		this.template = template;
	}
	beforeCreate(){
		//called before the component is created
	}
	afterMounted(){
		//called after component mount
	}
	exampleMethod($e) {
		this.iSetState(['props', 'child', 'item'], 'FOO');
	}
	propsChildObserver(){
		exmple observer
	}
}

export const child = IMPRESS.register(ICHILD);
```

5. register your component with iMpress

```
export const iapp = IMPRESS.register(IAPP);
```
6. methods are added as JSON strings in an i-event attribute - duplicate events are allowed in the JSON string. Specify params, data.property/props.property etc. $e or $event is the event object, or if no params are specified the event object will be the first param.
```
i-event={"click":"customMethod"}
```

9. Props are passed similar to React-like, an attribute wrapping a valid data or prop value will become a prop
```
<i-child title={data.title}></i-child>
```

10. Props are not mutable. They exist only as mapped namespaces for the child component to access the true owner of the data. Props when properly conceived are not local data, nor should they ever be considered as local data. To modify a prop, internally a propsMap contains data references to the true owner of the data, a setState method on each component can be used to request mutation and records a full log of where the data was changed.
```
this.iSetState(['props','child','index'], newValue);
```
No more contrived usage of class props to pass mutation methods throughout a system as is common in React. Calling this.iGetState will return the full data path and data owner of the prop which in development mode contains a list of mutations for ease of debugging.  

12. In-built query methods allow robust and debuggable communication between parent/child/siblings. No more eventbus/emits/contextAPI needed. Use iQuerySelector, iQuerySelectorAll, and iClosest. Additionally you can even use the DOM to extract registered components directly from the tree using the iGuid property of the components.

13. All methods exist as class proptotype methods. Consequently memory usage is a fraction the size of most frameworks.

14. All components can be added or removed simply by adding or removing their Custom Element HTML tag. No more contrived solutions such as portals, just add a tag where you want anywhere in the DOM. Everything is tracked, every component has a guid, it can be traced, used, and removed simply by requesting the component instance object.
```
<i-app></i-app> 
```

15. All Custom Element components must be hyphenated with one hyphen e.g. my-app, shopping-cart, address-form etc. 

## upto 1000 times faster than ReactJS, Vue and Angular
