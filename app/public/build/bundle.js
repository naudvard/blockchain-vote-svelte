
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function (Web3) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var Web3__default = /*#__PURE__*/_interopDefaultLegacy(Web3);

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var contractName = "Voting";
    var abi = [
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: true,
    				internalType: "address",
    				name: "previousOwner",
    				type: "address"
    			},
    			{
    				indexed: true,
    				internalType: "address",
    				name: "newOwner",
    				type: "address"
    			}
    		],
    		name: "OwnershipTransferred",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: false,
    				internalType: "uint256",
    				name: "proposalId",
    				type: "uint256"
    			}
    		],
    		name: "ProposalRegistered",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: false,
    				internalType: "address",
    				name: "voter",
    				type: "address"
    			},
    			{
    				indexed: false,
    				internalType: "uint256",
    				name: "proposalId",
    				type: "uint256"
    			}
    		],
    		name: "Voted",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: false,
    				internalType: "address",
    				name: "voterAddress",
    				type: "address"
    			}
    		],
    		name: "VoterRegistered",
    		type: "event"
    	},
    	{
    		anonymous: false,
    		inputs: [
    			{
    				indexed: false,
    				internalType: "enum Voting.WorkflowStatus",
    				name: "previousStatus",
    				type: "uint8"
    			},
    			{
    				indexed: false,
    				internalType: "enum Voting.WorkflowStatus",
    				name: "newStatus",
    				type: "uint8"
    			}
    		],
    		name: "WorkflowStatusChange",
    		type: "event"
    	},
    	{
    		inputs: [
    		],
    		name: "owner",
    		outputs: [
    			{
    				internalType: "address",
    				name: "",
    				type: "address"
    			}
    		],
    		stateMutability: "view",
    		type: "function",
    		constant: true
    	},
    	{
    		inputs: [
    		],
    		name: "renounceOwnership",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "address",
    				name: "newOwner",
    				type: "address"
    			}
    		],
    		name: "transferOwnership",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "getWorkflowStatus",
    		outputs: [
    			{
    				internalType: "enum Voting.WorkflowStatus",
    				name: "",
    				type: "uint8"
    			}
    		],
    		stateMutability: "view",
    		type: "function",
    		constant: true
    	},
    	{
    		inputs: [
    			{
    				internalType: "uint256",
    				name: "_proposalId",
    				type: "uint256"
    			}
    		],
    		name: "getOneProposal",
    		outputs: [
    			{
    				components: [
    					{
    						internalType: "string",
    						name: "description",
    						type: "string"
    					},
    					{
    						internalType: "uint256",
    						name: "voteCount",
    						type: "uint256"
    					}
    				],
    				internalType: "struct Voting.Proposal",
    				name: "",
    				type: "tuple"
    			}
    		],
    		stateMutability: "view",
    		type: "function",
    		constant: true
    	},
    	{
    		inputs: [
    		],
    		name: "getProposalsLength",
    		outputs: [
    			{
    				internalType: "uint256",
    				name: "",
    				type: "uint256"
    			}
    		],
    		stateMutability: "view",
    		type: "function",
    		constant: true
    	},
    	{
    		inputs: [
    			{
    				internalType: "address[]",
    				name: "_voters",
    				type: "address[]"
    			}
    		],
    		name: "registerVoters",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "startProposalsRegistration",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "endProposalsRegistration",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "startVotingSession",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "endVotingSession",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "string",
    				name: "_description",
    				type: "string"
    			}
    		],
    		name: "registerProposal",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    			{
    				internalType: "uint256",
    				name: "_proposalId",
    				type: "uint256"
    			}
    		],
    		name: "vote",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "tallyVotes",
    		outputs: [
    		],
    		stateMutability: "nonpayable",
    		type: "function"
    	},
    	{
    		inputs: [
    		],
    		name: "test",
    		outputs: [
    			{
    				internalType: "uint256",
    				name: "",
    				type: "uint256"
    			}
    		],
    		stateMutability: "pure",
    		type: "function",
    		constant: true
    	}
    ];
    var metadata = "{\"compiler\":{\"version\":\"0.8.19+commit.7dd6d404\"},\"language\":\"Solidity\",\"output\":{\"abi\":[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"proposalId\",\"type\":\"uint256\"}],\"name\":\"ProposalRegistered\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"voter\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"proposalId\",\"type\":\"uint256\"}],\"name\":\"Voted\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"voterAddress\",\"type\":\"address\"}],\"name\":\"VoterRegistered\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"enum Voting.WorkflowStatus\",\"name\":\"previousStatus\",\"type\":\"uint8\"},{\"indexed\":false,\"internalType\":\"enum Voting.WorkflowStatus\",\"name\":\"newStatus\",\"type\":\"uint8\"}],\"name\":\"WorkflowStatusChange\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"endProposalsRegistration\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"endVotingSession\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_proposalId\",\"type\":\"uint256\"}],\"name\":\"getOneProposal\",\"outputs\":[{\"components\":[{\"internalType\":\"string\",\"name\":\"description\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"voteCount\",\"type\":\"uint256\"}],\"internalType\":\"struct Voting.Proposal\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getProposalsLength\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getWorkflowStatus\",\"outputs\":[{\"internalType\":\"enum Voting.WorkflowStatus\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_description\",\"type\":\"string\"}],\"name\":\"registerProposal\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"_voters\",\"type\":\"address[]\"}],\"name\":\"registerVoters\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"renounceOwnership\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"startProposalsRegistration\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"startVotingSession\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"tallyVotes\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"test\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"pure\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"transferOwnership\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_proposalId\",\"type\":\"uint256\"}],\"name\":\"vote\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}],\"devdoc\":{\"author\":\"Wsh on est vraiment 8 ? / Modified by Nathan\",\"kind\":\"dev\",\"methods\":{\"endProposalsRegistration()\":{\"custom:accessibility\":\"Admin\"},\"endVotingSession()\":{\"custom:accessibility\":\"Admin\"},\"getProposalsLength()\":{\"custom:accessibility\":\"External\"},\"owner()\":{\"details\":\"Returns the address of the current owner.\"},\"registerProposal(string)\":{\"custom:accessibility\":\"Voters\",\"params\":{\"_description\":\": Description of their proposal\"}},\"registerVoters(address[])\":{\"custom:accessibility\":\"Admin\",\"params\":{\"_voters\":\": Address of voters\"}},\"renounceOwnership()\":{\"details\":\"Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.\"},\"startProposalsRegistration()\":{\"custom:accessibility\":\"Admin\"},\"startVotingSession()\":{\"custom:accessibility\":\"Admin\"},\"tallyVotes()\":{\"custom:accessibility\":\"Admin\"},\"transferOwnership(address)\":{\"details\":\"Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.\"},\"vote(uint256)\":{\"custom:accessibility\":\"Voters\",\"params\":{\"_proposalId\":\": Id of proposal\"}}},\"title\":\"A voting system\",\"version\":1},\"userdoc\":{\"kind\":\"user\",\"methods\":{\"endProposalsRegistration()\":{\"notice\":\"End proposal session\"},\"endVotingSession()\":{\"notice\":\"End voting session\"},\"getProposalsLength()\":{\"notice\":\"Get proposal array length to get array in front\"},\"registerProposal(string)\":{\"notice\":\"For users to register proposal\"},\"registerVoters(address[])\":{\"notice\":\"Register voters\"},\"startProposalsRegistration()\":{\"notice\":\"Start proposal session\"},\"startVotingSession()\":{\"notice\":\"Start voting session\"},\"tallyVotes()\":{\"notice\":\"Tally votes after ending voting session\"},\"vote(uint256)\":{\"notice\":\"For users to vote\"}},\"notice\":\"This system permit users to make proposals and vote them\",\"version\":1}},\"settings\":{\"compilationTarget\":{\"project:/contracts/Voting.sol\":\"Voting\"},\"evmVersion\":\"paris\",\"libraries\":{},\"metadata\":{\"bytecodeHash\":\"ipfs\"},\"optimizer\":{\"enabled\":false,\"runs\":200},\"remappings\":[]},\"sources\":{\"@openzeppelin/contracts/access/Ownable.sol\":{\"keccak256\":\"0xa94b34880e3c1b0b931662cb1c09e5dfa6662f31cba80e07c5ee71cd135c9673\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://40fb1b5102468f783961d0af743f91b9980cf66b50d1d12009f6bb1869cea4d2\",\"dweb:/ipfs/QmYqEbJML4jB1GHbzD4cUZDtJg5wVwNm3vDJq1GbyDus8y\"]},\"@openzeppelin/contracts/utils/Context.sol\":{\"keccak256\":\"0xe2e337e6dde9ef6b680e07338c493ebea1b5fd09b43424112868e9cc1706bca7\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://6df0ddf21ce9f58271bdfaa85cde98b200ef242a05a3f85c2bc10a8294800a92\",\"dweb:/ipfs/QmRK2Y5Yc6BK7tGKkgsgn3aJEQGi5aakeSPZvS65PV8Xp3\"]},\"project:/contracts/Voting.sol\":{\"keccak256\":\"0xd99aec2a5e8578832a347a42da9367684054aa0b4c8d2adb72ab294c8c628191\",\"license\":\"GPL-3.0\",\"urls\":[\"bzz-raw://a400e289bf40b4ac49129ecf370d016f08561d6aa17a591ce372e44e9452382d\",\"dweb:/ipfs/QmXTd6wD9ahEKVKw2UdcBovjjzwPtaNroYeqicShS53BM3\"]}},\"version\":1}";
    var bytecode = "0x608060405234801561001057600080fd5b5061002d61002261003260201b60201c565b61003a60201b60201c565b6100fe565b600033905090565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b612431806200010e6000396000f3fe608060405234801561001057600080fd5b50600436106100f55760003560e01c8063a7bfab1611610097578063ee74c67811610066578063ee74c678146101ec578063f2fde38b146101f6578063f75d64a614610212578063f8a8fd6d14610230576100f5565b8063a7bfab161461019e578063bc378a73146101a8578063d55ec9c1146101c6578063e09b8c79146101e2576100f5565b80636c297445116100d35780636c2974451461013c578063715018a6146101465780638da5cb5b14610150578063a2788cce1461016e576100f5565b80630121b93f146100fa5780632f95355b14610116578063378a217814610132575b600080fd5b610114600480360381019061010f919061121e565b61024e565b005b610130600480360381019061012b9190611391565b610486565b005b61013a610797565b005b6101446108cb565b005b61014e6109bf565b005b6101586109d3565b604051610165919061141b565b60405180910390f35b6101886004803603810190610183919061121e565b6109fc565b6040516101959190611501565b60405180910390f35b6101a6610ad4565b005b6101b0610bc7565b6040516101bd9190611532565b60405180910390f35b6101e060048036038101906101db9190611641565b610bd4565b005b6101ea610de5565b005b6101f4610ed9565b005b610210600480360381019061020b919061168a565b610fcd565b005b61021a611050565b604051610227919061172e565b60405180910390f35b610238611067565b6040516102459190611532565b60405180910390f35b600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff166102dd576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102d4906117a6565b60405180910390fd5b600360058111156102f1576102f06116b7565b5b600460009054906101000a900460ff166005811115610313576103126116b7565b5b14610353576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161034a90611838565b60405180910390fd5b6000600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002090508060000160019054906101000a900460ff16156103e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103df906118a4565b60405180910390fd5b60018160000160016101000a81548160ff02191690831515021790555081816001018190555060038281548110610422576104216118c4565b5b9060005260206000209060020201600101600081548092919061044490611922565b91905055507f4d99b957a2bc29a30ebd96a7be8e68fe50a3c701db28a91436490b7d53870ca4338360405161047a92919061196a565b60405180910390a15050565b600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff16610515576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161050c906117a6565b60405180910390fd5b60016005811115610529576105286116b7565b5b600460009054906101000a900460ff16600581111561054b5761054a6116b7565b5b1461058b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161058290611a05565b60405180910390fd5b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470816040516020016105bd9190611a61565b6040516020818303038152906040528051906020012003610613576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161060a90611ac4565b60405180910390fd5b60005b60038054905081101561079357816040516020016106349190611a61565b604051602081830303815290604052805190602001206003828154811061065e5761065d6118c4565b5b906000526020600020906002020160000160405160200161067f9190611bdc565b60405160208183030381529060405280519060200120036106d5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106cc90611c3f565b60405180910390fd5b6003604051806040016040528084815260200160008152509080600181540180825580915050600190039060005260206000209060020201600090919091909150600082015181600001908161072b9190611df6565b506020820151816001015550507f92e393e9b54e2f801d3ea4beb0c5e71a21cc34a5d34b77d0fb8a3aa1650dc18f600160038054905061076b9190611ec8565b6040516107789190611532565b60405180910390a1808061078b90611922565b915050610616565b5050565b61079f611070565b600460058111156107b3576107b26116b7565b5b600460009054906101000a900460ff1660058111156107d5576107d46116b7565b5b14610815576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161080c90611f6e565b60405180910390fd5b60008060005b60038054905081101561089457826003828154811061083d5761083c6118c4565b5b90600052602060002090600202016001015411156108815760038181548110610869576108686118c4565b5b90600052602060002090600202016001015492508091505b808061088c90611922565b91505061081b565b50806001819055506005600460006101000a81548160ff021916908360058111156108c2576108c16116b7565b5b02179055505050565b6108d3611070565b600160058111156108e7576108e66116b7565b5b600460009054906101000a900460ff166005811115610909576109086116b7565b5b14610949576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161094090612000565b60405180910390fd5b6002600460006101000a81548160ff0219169083600581111561096f5761096e6116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6001600460009054906101000a900460ff166040516109b5929190612020565b60405180910390a1565b6109c7611070565b6109d160006110ee565b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b610a046111ba565b60038281548110610a1857610a176118c4565b5b9060005260206000209060020201604051806040016040529081600082018054610a4190611b13565b80601f0160208091040260200160405190810160405280929190818152602001828054610a6d90611b13565b8015610aba5780601f10610a8f57610100808354040283529160200191610aba565b820191906000526020600020905b815481529060010190602001808311610a9d57829003601f168201915b505050505081526020016001820154815250509050919050565b610adc611070565b60036005811115610af057610aef6116b7565b5b600460009054906101000a900460ff166005811115610b1257610b116116b7565b5b14610b52576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b49906120bb565b60405180910390fd5b60048060006101000a81548160ff02191690836005811115610b7757610b766116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6003600460009054906101000a900460ff16604051610bbd929190612020565b60405180910390a1565b6000600380549050905090565b610bdc611070565b60006005811115610bf057610bef6116b7565b5b600460009054906101000a900460ff166005811115610c1257610c116116b7565b5b14610c52576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610c499061214d565b60405180910390fd5b60005b8151811015610de15760026000838381518110610c7557610c746118c4565b5b602002602001015173ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff1615610d08576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610cff906121b9565b60405180910390fd5b600160026000848481518110610d2157610d206118c4565b5b602002602001015173ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160006101000a81548160ff0219169083151502179055507fb6be2187d059cc2a55fe29e0e503b566e1e0f8c8780096e185429350acffd3dd828281518110610db157610db06118c4565b5b6020026020010151604051610dc6919061141b565b60405180910390a18080610dd990611922565b915050610c55565b5050565b610ded611070565b60006005811115610e0157610e006116b7565b5b600460009054906101000a900460ff166005811115610e2357610e226116b7565b5b14610e63576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610e5a9061224b565b60405180910390fd5b6001600460006101000a81548160ff02191690836005811115610e8957610e886116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6000600460009054906101000a900460ff16604051610ecf929190612020565b60405180910390a1565b610ee1611070565b60026005811115610ef557610ef46116b7565b5b600460009054906101000a900460ff166005811115610f1757610f166116b7565b5b14610f57576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f4e906122dd565b60405180910390fd5b6003600460006101000a81548160ff02191690836005811115610f7d57610f7c6116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6002600460009054906101000a900460ff16604051610fc3929190612020565b60405180910390a1565b610fd5611070565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603611044576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161103b9061236f565b60405180910390fd5b61104d816110ee565b50565b6000600460009054906101000a900460ff16905090565b60006001905090565b6110786111b2565b73ffffffffffffffffffffffffffffffffffffffff166110966109d3565b73ffffffffffffffffffffffffffffffffffffffff16146110ec576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110e3906123db565b60405180910390fd5b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b600033905090565b604051806040016040528060608152602001600081525090565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b6111fb816111e8565b811461120657600080fd5b50565b600081359050611218816111f2565b92915050565b600060208284031215611234576112336111de565b5b600061124284828501611209565b91505092915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61129e82611255565b810181811067ffffffffffffffff821117156112bd576112bc611266565b5b80604052505050565b60006112d06111d4565b90506112dc8282611295565b919050565b600067ffffffffffffffff8211156112fc576112fb611266565b5b61130582611255565b9050602081019050919050565b82818337600083830152505050565b600061133461132f846112e1565b6112c6565b9050828152602081018484840111156113505761134f611250565b5b61135b848285611312565b509392505050565b600082601f8301126113785761137761124b565b5b8135611388848260208601611321565b91505092915050565b6000602082840312156113a7576113a66111de565b5b600082013567ffffffffffffffff8111156113c5576113c46111e3565b5b6113d184828501611363565b91505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000611405826113da565b9050919050565b611415816113fa565b82525050565b6000602082019050611430600083018461140c565b92915050565b600081519050919050565b600082825260208201905092915050565b60005b83811015611470578082015181840152602081019050611455565b60008484015250505050565b600061148782611436565b6114918185611441565b93506114a1818560208601611452565b6114aa81611255565b840191505092915050565b6114be816111e8565b82525050565b600060408301600083015184820360008601526114e1828261147c565b91505060208301516114f660208601826114b5565b508091505092915050565b6000602082019050818103600083015261151b81846114c4565b905092915050565b61152c816111e8565b82525050565b60006020820190506115476000830184611523565b92915050565b600067ffffffffffffffff82111561156857611567611266565b5b602082029050602081019050919050565b600080fd5b611587816113fa565b811461159257600080fd5b50565b6000813590506115a48161157e565b92915050565b60006115bd6115b88461154d565b6112c6565b905080838252602082019050602084028301858111156115e0576115df611579565b5b835b8181101561160957806115f58882611595565b8452602084019350506020810190506115e2565b5050509392505050565b600082601f8301126116285761162761124b565b5b81356116388482602086016115aa565b91505092915050565b600060208284031215611657576116566111de565b5b600082013567ffffffffffffffff811115611675576116746111e3565b5b61168184828501611613565b91505092915050565b6000602082840312156116a05761169f6111de565b5b60006116ae84828501611595565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b600681106116f7576116f66116b7565b5b50565b6000819050611708826116e6565b919050565b6000611718826116fa565b9050919050565b6117288161170d565b82525050565b6000602082019050611743600083018461171f565b92915050565b600082825260208201905092915050565b7f596f7520617265206e6f74207265676973746572656420746f20766f74652e00600082015250565b6000611790601f83611749565b915061179b8261175a565b602082019050919050565b600060208201905081810360008301526117bf81611783565b9050919050565b7f54686520766f74696e672073657373696f6e206973206e6f742061637469766560008201527f2e00000000000000000000000000000000000000000000000000000000000000602082015250565b6000611822602183611749565b915061182d826117c6565b604082019050919050565b6000602082019050818103600083015261185181611815565b9050919050565b7f596f75206861766520616c726561647920766f7465642e000000000000000000600082015250565b600061188e601783611749565b915061189982611858565b602082019050919050565b600060208201905081810360008301526118bd81611881565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061192d826111e8565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361195f5761195e6118f3565b5b600182019050919050565b600060408201905061197f600083018561140c565b61198c6020830184611523565b9392505050565b7f50726f706f73616c7320726567697374726174696f6e206973206e6f7420616360008201527f746976652e000000000000000000000000000000000000000000000000000000602082015250565b60006119ef602583611749565b91506119fa82611993565b604082019050919050565b60006020820190508181036000830152611a1e816119e2565b9050919050565b600081905092915050565b6000611a3b82611436565b611a458185611a25565b9350611a55818560208601611452565b80840191505092915050565b6000611a6d8284611a30565b915081905092915050565b7f50726f706f73616c2063616e2774206265206e756c6c00000000000000000000600082015250565b6000611aae601683611749565b9150611ab982611a78565b602082019050919050565b60006020820190508181036000830152611add81611aa1565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680611b2b57607f821691505b602082108103611b3e57611b3d611ae4565b5b50919050565b60008190508160005260206000209050919050565b60008154611b6681611b13565b611b708186611a25565b94506001821660008114611b8b5760018114611ba057611bd3565b60ff1983168652811515820286019350611bd3565b611ba985611b44565b60005b83811015611bcb57815481890152600182019150602081019050611bac565b838801955050505b50505092915050565b6000611be88284611b59565b915081905092915050565b7f50726f706f73616c20616c726561647920726567697374657265642e00000000600082015250565b6000611c29601c83611749565b9150611c3482611bf3565b602082019050919050565b60006020820190508181036000830152611c5881611c1c565b9050919050565b60006020601f8301049050919050565b600082821b905092915050565b600060088302611cac7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82611c6f565b611cb68683611c6f565b95508019841693508086168417925050509392505050565b6000819050919050565b6000611cf3611cee611ce9846111e8565b611cce565b6111e8565b9050919050565b6000819050919050565b611d0d83611cd8565b611d21611d1982611cfa565b848454611c7c565b825550505050565b600090565b611d36611d29565b611d41818484611d04565b505050565b5b81811015611d6557611d5a600082611d2e565b600181019050611d47565b5050565b601f821115611daa57611d7b81611b44565b611d8484611c5f565b81016020851015611d93578190505b611da7611d9f85611c5f565b830182611d46565b50505b505050565b600082821c905092915050565b6000611dcd60001984600802611daf565b1980831691505092915050565b6000611de68383611dbc565b9150826002028217905092915050565b611dff82611436565b67ffffffffffffffff811115611e1857611e17611266565b5b611e228254611b13565b611e2d828285611d69565b600060209050601f831160018114611e605760008415611e4e578287015190505b611e588582611dda565b865550611ec0565b601f198416611e6e86611b44565b60005b82811015611e9657848901518255600182019150602085019450602081019050611e71565b86831015611eb35784890151611eaf601f891682611dbc565b8355505b6001600288020188555050505b505050505050565b6000611ed3826111e8565b9150611ede836111e8565b9250828203905081811115611ef657611ef56118f3565b5b92915050565b7f54686520766f74696e672073657373696f6e206973207374696c6c206163746960008201527f76652e0000000000000000000000000000000000000000000000000000000000602082015250565b6000611f58602383611749565b9150611f6382611efc565b604082019050919050565b60006020820190508181036000830152611f8781611f4b565b9050919050565b7f43616e6e6f7420656e642070726f706f73616c7320726567697374726174696f60008201527f6e20617420746869732074696d652e0000000000000000000000000000000000602082015250565b6000611fea602f83611749565b9150611ff582611f8e565b604082019050919050565b6000602082019050818103600083015261201981611fdd565b9050919050565b6000604082019050612035600083018561171f565b612042602083018461171f565b9392505050565b7f43616e6e6f7420656e6420766f74696e672073657373696f6e2061742074686960008201527f732074696d652e00000000000000000000000000000000000000000000000000602082015250565b60006120a5602783611749565b91506120b082612049565b604082019050919050565b600060208201905081810360008301526120d481612098565b9050919050565b7f43616e6e6f7420726567697374657220766f746572732061742074686973207460008201527f696d652e00000000000000000000000000000000000000000000000000000000602082015250565b6000612137602483611749565b9150612142826120db565b604082019050919050565b600060208201905081810360008301526121668161212a565b9050919050565b7f566f74657220616c726561647920726567697374657265642e00000000000000600082015250565b60006121a3601983611749565b91506121ae8261216d565b602082019050919050565b600060208201905081810360008301526121d281612196565b9050919050565b7f43616e6e6f742073746172742070726f706f73616c732072656769737472617460008201527f696f6e20617420746869732074696d652e000000000000000000000000000000602082015250565b6000612235603183611749565b9150612240826121d9565b604082019050919050565b6000602082019050818103600083015261226481612228565b9050919050565b7f43616e6e6f7420737461727420766f74696e672073657373696f6e206174207460008201527f6869732074696d652e0000000000000000000000000000000000000000000000602082015250565b60006122c7602983611749565b91506122d28261226b565b604082019050919050565b600060208201905081810360008301526122f6816122ba565b9050919050565b7f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160008201527f6464726573730000000000000000000000000000000000000000000000000000602082015250565b6000612359602683611749565b9150612364826122fd565b604082019050919050565b600060208201905081810360008301526123888161234c565b9050919050565b7f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572600082015250565b60006123c5602083611749565b91506123d08261238f565b602082019050919050565b600060208201905081810360008301526123f4816123b8565b905091905056fea2646970667358221220fd1fb0037d1f6c981cbcc76e20abc0faec40bd178e88c0a420bd183c699c80f564736f6c63430008130033";
    var deployedBytecode = "0x608060405234801561001057600080fd5b50600436106100f55760003560e01c8063a7bfab1611610097578063ee74c67811610066578063ee74c678146101ec578063f2fde38b146101f6578063f75d64a614610212578063f8a8fd6d14610230576100f5565b8063a7bfab161461019e578063bc378a73146101a8578063d55ec9c1146101c6578063e09b8c79146101e2576100f5565b80636c297445116100d35780636c2974451461013c578063715018a6146101465780638da5cb5b14610150578063a2788cce1461016e576100f5565b80630121b93f146100fa5780632f95355b14610116578063378a217814610132575b600080fd5b610114600480360381019061010f919061121e565b61024e565b005b610130600480360381019061012b9190611391565b610486565b005b61013a610797565b005b6101446108cb565b005b61014e6109bf565b005b6101586109d3565b604051610165919061141b565b60405180910390f35b6101886004803603810190610183919061121e565b6109fc565b6040516101959190611501565b60405180910390f35b6101a6610ad4565b005b6101b0610bc7565b6040516101bd9190611532565b60405180910390f35b6101e060048036038101906101db9190611641565b610bd4565b005b6101ea610de5565b005b6101f4610ed9565b005b610210600480360381019061020b919061168a565b610fcd565b005b61021a611050565b604051610227919061172e565b60405180910390f35b610238611067565b6040516102459190611532565b60405180910390f35b600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff166102dd576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102d4906117a6565b60405180910390fd5b600360058111156102f1576102f06116b7565b5b600460009054906101000a900460ff166005811115610313576103126116b7565b5b14610353576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161034a90611838565b60405180910390fd5b6000600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002090508060000160019054906101000a900460ff16156103e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103df906118a4565b60405180910390fd5b60018160000160016101000a81548160ff02191690831515021790555081816001018190555060038281548110610422576104216118c4565b5b9060005260206000209060020201600101600081548092919061044490611922565b91905055507f4d99b957a2bc29a30ebd96a7be8e68fe50a3c701db28a91436490b7d53870ca4338360405161047a92919061196a565b60405180910390a15050565b600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff16610515576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161050c906117a6565b60405180910390fd5b60016005811115610529576105286116b7565b5b600460009054906101000a900460ff16600581111561054b5761054a6116b7565b5b1461058b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161058290611a05565b60405180910390fd5b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470816040516020016105bd9190611a61565b6040516020818303038152906040528051906020012003610613576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161060a90611ac4565b60405180910390fd5b60005b60038054905081101561079357816040516020016106349190611a61565b604051602081830303815290604052805190602001206003828154811061065e5761065d6118c4565b5b906000526020600020906002020160000160405160200161067f9190611bdc565b60405160208183030381529060405280519060200120036106d5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106cc90611c3f565b60405180910390fd5b6003604051806040016040528084815260200160008152509080600181540180825580915050600190039060005260206000209060020201600090919091909150600082015181600001908161072b9190611df6565b506020820151816001015550507f92e393e9b54e2f801d3ea4beb0c5e71a21cc34a5d34b77d0fb8a3aa1650dc18f600160038054905061076b9190611ec8565b6040516107789190611532565b60405180910390a1808061078b90611922565b915050610616565b5050565b61079f611070565b600460058111156107b3576107b26116b7565b5b600460009054906101000a900460ff1660058111156107d5576107d46116b7565b5b14610815576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161080c90611f6e565b60405180910390fd5b60008060005b60038054905081101561089457826003828154811061083d5761083c6118c4565b5b90600052602060002090600202016001015411156108815760038181548110610869576108686118c4565b5b90600052602060002090600202016001015492508091505b808061088c90611922565b91505061081b565b50806001819055506005600460006101000a81548160ff021916908360058111156108c2576108c16116b7565b5b02179055505050565b6108d3611070565b600160058111156108e7576108e66116b7565b5b600460009054906101000a900460ff166005811115610909576109086116b7565b5b14610949576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161094090612000565b60405180910390fd5b6002600460006101000a81548160ff0219169083600581111561096f5761096e6116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6001600460009054906101000a900460ff166040516109b5929190612020565b60405180910390a1565b6109c7611070565b6109d160006110ee565b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b610a046111ba565b60038281548110610a1857610a176118c4565b5b9060005260206000209060020201604051806040016040529081600082018054610a4190611b13565b80601f0160208091040260200160405190810160405280929190818152602001828054610a6d90611b13565b8015610aba5780601f10610a8f57610100808354040283529160200191610aba565b820191906000526020600020905b815481529060010190602001808311610a9d57829003601f168201915b505050505081526020016001820154815250509050919050565b610adc611070565b60036005811115610af057610aef6116b7565b5b600460009054906101000a900460ff166005811115610b1257610b116116b7565b5b14610b52576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b49906120bb565b60405180910390fd5b60048060006101000a81548160ff02191690836005811115610b7757610b766116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6003600460009054906101000a900460ff16604051610bbd929190612020565b60405180910390a1565b6000600380549050905090565b610bdc611070565b60006005811115610bf057610bef6116b7565b5b600460009054906101000a900460ff166005811115610c1257610c116116b7565b5b14610c52576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610c499061214d565b60405180910390fd5b60005b8151811015610de15760026000838381518110610c7557610c746118c4565b5b602002602001015173ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160009054906101000a900460ff1615610d08576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610cff906121b9565b60405180910390fd5b600160026000848481518110610d2157610d206118c4565b5b602002602001015173ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060000160006101000a81548160ff0219169083151502179055507fb6be2187d059cc2a55fe29e0e503b566e1e0f8c8780096e185429350acffd3dd828281518110610db157610db06118c4565b5b6020026020010151604051610dc6919061141b565b60405180910390a18080610dd990611922565b915050610c55565b5050565b610ded611070565b60006005811115610e0157610e006116b7565b5b600460009054906101000a900460ff166005811115610e2357610e226116b7565b5b14610e63576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610e5a9061224b565b60405180910390fd5b6001600460006101000a81548160ff02191690836005811115610e8957610e886116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6000600460009054906101000a900460ff16604051610ecf929190612020565b60405180910390a1565b610ee1611070565b60026005811115610ef557610ef46116b7565b5b600460009054906101000a900460ff166005811115610f1757610f166116b7565b5b14610f57576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f4e906122dd565b60405180910390fd5b6003600460006101000a81548160ff02191690836005811115610f7d57610f7c6116b7565b5b02179055507f0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f6002600460009054906101000a900460ff16604051610fc3929190612020565b60405180910390a1565b610fd5611070565b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603611044576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161103b9061236f565b60405180910390fd5b61104d816110ee565b50565b6000600460009054906101000a900460ff16905090565b60006001905090565b6110786111b2565b73ffffffffffffffffffffffffffffffffffffffff166110966109d3565b73ffffffffffffffffffffffffffffffffffffffff16146110ec576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110e3906123db565b60405180910390fd5b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050816000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b600033905090565b604051806040016040528060608152602001600081525090565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b6111fb816111e8565b811461120657600080fd5b50565b600081359050611218816111f2565b92915050565b600060208284031215611234576112336111de565b5b600061124284828501611209565b91505092915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61129e82611255565b810181811067ffffffffffffffff821117156112bd576112bc611266565b5b80604052505050565b60006112d06111d4565b90506112dc8282611295565b919050565b600067ffffffffffffffff8211156112fc576112fb611266565b5b61130582611255565b9050602081019050919050565b82818337600083830152505050565b600061133461132f846112e1565b6112c6565b9050828152602081018484840111156113505761134f611250565b5b61135b848285611312565b509392505050565b600082601f8301126113785761137761124b565b5b8135611388848260208601611321565b91505092915050565b6000602082840312156113a7576113a66111de565b5b600082013567ffffffffffffffff8111156113c5576113c46111e3565b5b6113d184828501611363565b91505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000611405826113da565b9050919050565b611415816113fa565b82525050565b6000602082019050611430600083018461140c565b92915050565b600081519050919050565b600082825260208201905092915050565b60005b83811015611470578082015181840152602081019050611455565b60008484015250505050565b600061148782611436565b6114918185611441565b93506114a1818560208601611452565b6114aa81611255565b840191505092915050565b6114be816111e8565b82525050565b600060408301600083015184820360008601526114e1828261147c565b91505060208301516114f660208601826114b5565b508091505092915050565b6000602082019050818103600083015261151b81846114c4565b905092915050565b61152c816111e8565b82525050565b60006020820190506115476000830184611523565b92915050565b600067ffffffffffffffff82111561156857611567611266565b5b602082029050602081019050919050565b600080fd5b611587816113fa565b811461159257600080fd5b50565b6000813590506115a48161157e565b92915050565b60006115bd6115b88461154d565b6112c6565b905080838252602082019050602084028301858111156115e0576115df611579565b5b835b8181101561160957806115f58882611595565b8452602084019350506020810190506115e2565b5050509392505050565b600082601f8301126116285761162761124b565b5b81356116388482602086016115aa565b91505092915050565b600060208284031215611657576116566111de565b5b600082013567ffffffffffffffff811115611675576116746111e3565b5b61168184828501611613565b91505092915050565b6000602082840312156116a05761169f6111de565b5b60006116ae84828501611595565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fd5b600681106116f7576116f66116b7565b5b50565b6000819050611708826116e6565b919050565b6000611718826116fa565b9050919050565b6117288161170d565b82525050565b6000602082019050611743600083018461171f565b92915050565b600082825260208201905092915050565b7f596f7520617265206e6f74207265676973746572656420746f20766f74652e00600082015250565b6000611790601f83611749565b915061179b8261175a565b602082019050919050565b600060208201905081810360008301526117bf81611783565b9050919050565b7f54686520766f74696e672073657373696f6e206973206e6f742061637469766560008201527f2e00000000000000000000000000000000000000000000000000000000000000602082015250565b6000611822602183611749565b915061182d826117c6565b604082019050919050565b6000602082019050818103600083015261185181611815565b9050919050565b7f596f75206861766520616c726561647920766f7465642e000000000000000000600082015250565b600061188e601783611749565b915061189982611858565b602082019050919050565b600060208201905081810360008301526118bd81611881565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061192d826111e8565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361195f5761195e6118f3565b5b600182019050919050565b600060408201905061197f600083018561140c565b61198c6020830184611523565b9392505050565b7f50726f706f73616c7320726567697374726174696f6e206973206e6f7420616360008201527f746976652e000000000000000000000000000000000000000000000000000000602082015250565b60006119ef602583611749565b91506119fa82611993565b604082019050919050565b60006020820190508181036000830152611a1e816119e2565b9050919050565b600081905092915050565b6000611a3b82611436565b611a458185611a25565b9350611a55818560208601611452565b80840191505092915050565b6000611a6d8284611a30565b915081905092915050565b7f50726f706f73616c2063616e2774206265206e756c6c00000000000000000000600082015250565b6000611aae601683611749565b9150611ab982611a78565b602082019050919050565b60006020820190508181036000830152611add81611aa1565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680611b2b57607f821691505b602082108103611b3e57611b3d611ae4565b5b50919050565b60008190508160005260206000209050919050565b60008154611b6681611b13565b611b708186611a25565b94506001821660008114611b8b5760018114611ba057611bd3565b60ff1983168652811515820286019350611bd3565b611ba985611b44565b60005b83811015611bcb57815481890152600182019150602081019050611bac565b838801955050505b50505092915050565b6000611be88284611b59565b915081905092915050565b7f50726f706f73616c20616c726561647920726567697374657265642e00000000600082015250565b6000611c29601c83611749565b9150611c3482611bf3565b602082019050919050565b60006020820190508181036000830152611c5881611c1c565b9050919050565b60006020601f8301049050919050565b600082821b905092915050565b600060088302611cac7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82611c6f565b611cb68683611c6f565b95508019841693508086168417925050509392505050565b6000819050919050565b6000611cf3611cee611ce9846111e8565b611cce565b6111e8565b9050919050565b6000819050919050565b611d0d83611cd8565b611d21611d1982611cfa565b848454611c7c565b825550505050565b600090565b611d36611d29565b611d41818484611d04565b505050565b5b81811015611d6557611d5a600082611d2e565b600181019050611d47565b5050565b601f821115611daa57611d7b81611b44565b611d8484611c5f565b81016020851015611d93578190505b611da7611d9f85611c5f565b830182611d46565b50505b505050565b600082821c905092915050565b6000611dcd60001984600802611daf565b1980831691505092915050565b6000611de68383611dbc565b9150826002028217905092915050565b611dff82611436565b67ffffffffffffffff811115611e1857611e17611266565b5b611e228254611b13565b611e2d828285611d69565b600060209050601f831160018114611e605760008415611e4e578287015190505b611e588582611dda565b865550611ec0565b601f198416611e6e86611b44565b60005b82811015611e9657848901518255600182019150602085019450602081019050611e71565b86831015611eb35784890151611eaf601f891682611dbc565b8355505b6001600288020188555050505b505050505050565b6000611ed3826111e8565b9150611ede836111e8565b9250828203905081811115611ef657611ef56118f3565b5b92915050565b7f54686520766f74696e672073657373696f6e206973207374696c6c206163746960008201527f76652e0000000000000000000000000000000000000000000000000000000000602082015250565b6000611f58602383611749565b9150611f6382611efc565b604082019050919050565b60006020820190508181036000830152611f8781611f4b565b9050919050565b7f43616e6e6f7420656e642070726f706f73616c7320726567697374726174696f60008201527f6e20617420746869732074696d652e0000000000000000000000000000000000602082015250565b6000611fea602f83611749565b9150611ff582611f8e565b604082019050919050565b6000602082019050818103600083015261201981611fdd565b9050919050565b6000604082019050612035600083018561171f565b612042602083018461171f565b9392505050565b7f43616e6e6f7420656e6420766f74696e672073657373696f6e2061742074686960008201527f732074696d652e00000000000000000000000000000000000000000000000000602082015250565b60006120a5602783611749565b91506120b082612049565b604082019050919050565b600060208201905081810360008301526120d481612098565b9050919050565b7f43616e6e6f7420726567697374657220766f746572732061742074686973207460008201527f696d652e00000000000000000000000000000000000000000000000000000000602082015250565b6000612137602483611749565b9150612142826120db565b604082019050919050565b600060208201905081810360008301526121668161212a565b9050919050565b7f566f74657220616c726561647920726567697374657265642e00000000000000600082015250565b60006121a3601983611749565b91506121ae8261216d565b602082019050919050565b600060208201905081810360008301526121d281612196565b9050919050565b7f43616e6e6f742073746172742070726f706f73616c732072656769737472617460008201527f696f6e20617420746869732074696d652e000000000000000000000000000000602082015250565b6000612235603183611749565b9150612240826121d9565b604082019050919050565b6000602082019050818103600083015261226481612228565b9050919050565b7f43616e6e6f7420737461727420766f74696e672073657373696f6e206174207460008201527f6869732074696d652e0000000000000000000000000000000000000000000000602082015250565b60006122c7602983611749565b91506122d28261226b565b604082019050919050565b600060208201905081810360008301526122f6816122ba565b9050919050565b7f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160008201527f6464726573730000000000000000000000000000000000000000000000000000602082015250565b6000612359602683611749565b9150612364826122fd565b604082019050919050565b600060208201905081810360008301526123888161234c565b9050919050565b7f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572600082015250565b60006123c5602083611749565b91506123d08261238f565b602082019050919050565b600060208201905081810360008301526123f4816123b8565b905091905056fea2646970667358221220fd1fb0037d1f6c981cbcc76e20abc0faec40bd178e88c0a420bd183c699c80f564736f6c63430008130033";
    var immutableReferences = {
    };
    var generatedSources = [
    ];
    var deployedGeneratedSources = [
    	{
    		ast: {
    			nodeType: "YulBlock",
    			src: "0:34254:3",
    			statements: [
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "47:35:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "57:19:3",
    								value: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "73:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "mload",
    										nodeType: "YulIdentifier",
    										src: "67:5:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "67:9:3"
    								},
    								variableNames: [
    									{
    										name: "memPtr",
    										nodeType: "YulIdentifier",
    										src: "57:6:3"
    									}
    								]
    							}
    						]
    					},
    					name: "allocate_unbounded",
    					nodeType: "YulFunctionDefinition",
    					returnVariables: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "40:6:3",
    							type: ""
    						}
    					],
    					src: "7:75:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "177:28:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "194:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "197:1:3",
    											type: "",
    											value: "0"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "187:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "187:12:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "187:12:3"
    							}
    						]
    					},
    					name: "revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b",
    					nodeType: "YulFunctionDefinition",
    					src: "88:117:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "300:28:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "317:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "320:1:3",
    											type: "",
    											value: "0"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "310:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "310:12:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "310:12:3"
    							}
    						]
    					},
    					name: "revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db",
    					nodeType: "YulFunctionDefinition",
    					src: "211:117:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "379:32:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "389:16:3",
    								value: {
    									name: "value",
    									nodeType: "YulIdentifier",
    									src: "400:5:3"
    								},
    								variableNames: [
    									{
    										name: "cleaned",
    										nodeType: "YulIdentifier",
    										src: "389:7:3"
    									}
    								]
    							}
    						]
    					},
    					name: "cleanup_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "361:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "cleaned",
    							nodeType: "YulTypedName",
    							src: "371:7:3",
    							type: ""
    						}
    					],
    					src: "334:77:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "460:79:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "517:16:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "526:1:3",
    														type: "",
    														value: "0"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "529:1:3",
    														type: "",
    														value: "0"
    													}
    												],
    												functionName: {
    													name: "revert",
    													nodeType: "YulIdentifier",
    													src: "519:6:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "519:12:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "519:12:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "483:5:3"
    												},
    												{
    													"arguments": [
    														{
    															name: "value",
    															nodeType: "YulIdentifier",
    															src: "508:5:3"
    														}
    													],
    													functionName: {
    														name: "cleanup_t_uint256",
    														nodeType: "YulIdentifier",
    														src: "490:17:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "490:24:3"
    												}
    											],
    											functionName: {
    												name: "eq",
    												nodeType: "YulIdentifier",
    												src: "480:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "480:35:3"
    										}
    									],
    									functionName: {
    										name: "iszero",
    										nodeType: "YulIdentifier",
    										src: "473:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "473:43:3"
    								},
    								nodeType: "YulIf",
    								src: "470:63:3"
    							}
    						]
    					},
    					name: "validator_revert_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "453:5:3",
    							type: ""
    						}
    					],
    					src: "417:122:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "597:87:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "607:29:3",
    								value: {
    									"arguments": [
    										{
    											name: "offset",
    											nodeType: "YulIdentifier",
    											src: "629:6:3"
    										}
    									],
    									functionName: {
    										name: "calldataload",
    										nodeType: "YulIdentifier",
    										src: "616:12:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "616:20:3"
    								},
    								variableNames: [
    									{
    										name: "value",
    										nodeType: "YulIdentifier",
    										src: "607:5:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "672:5:3"
    										}
    									],
    									functionName: {
    										name: "validator_revert_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "645:26:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "645:33:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "645:33:3"
    							}
    						]
    					},
    					name: "abi_decode_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "offset",
    							nodeType: "YulTypedName",
    							src: "575:6:3",
    							type: ""
    						},
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "583:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "591:5:3",
    							type: ""
    						}
    					],
    					src: "545:139:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "756:263:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "802:83:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b",
    													nodeType: "YulIdentifier",
    													src: "804:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "804:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "804:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "777:7:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "786:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "773:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "773:23:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "798:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "slt",
    										nodeType: "YulIdentifier",
    										src: "769:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "769:32:3"
    								},
    								nodeType: "YulIf",
    								src: "766:119:3"
    							},
    							{
    								nodeType: "YulBlock",
    								src: "895:117:3",
    								statements: [
    									{
    										nodeType: "YulVariableDeclaration",
    										src: "910:15:3",
    										value: {
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "924:1:3",
    											type: "",
    											value: "0"
    										},
    										variables: [
    											{
    												name: "offset",
    												nodeType: "YulTypedName",
    												src: "914:6:3",
    												type: ""
    											}
    										]
    									},
    									{
    										nodeType: "YulAssignment",
    										src: "939:63:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "headStart",
    															nodeType: "YulIdentifier",
    															src: "974:9:3"
    														},
    														{
    															name: "offset",
    															nodeType: "YulIdentifier",
    															src: "985:6:3"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "970:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "970:22:3"
    												},
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "994:7:3"
    												}
    											],
    											functionName: {
    												name: "abi_decode_t_uint256",
    												nodeType: "YulIdentifier",
    												src: "949:20:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "949:53:3"
    										},
    										variableNames: [
    											{
    												name: "value0",
    												nodeType: "YulIdentifier",
    												src: "939:6:3"
    											}
    										]
    									}
    								]
    							}
    						]
    					},
    					name: "abi_decode_tuple_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "726:9:3",
    							type: ""
    						},
    						{
    							name: "dataEnd",
    							nodeType: "YulTypedName",
    							src: "737:7:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "749:6:3",
    							type: ""
    						}
    					],
    					src: "690:329:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "1114:28:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1131:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1134:1:3",
    											type: "",
    											value: "0"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "1124:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1124:12:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "1124:12:3"
    							}
    						]
    					},
    					name: "revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d",
    					nodeType: "YulFunctionDefinition",
    					src: "1025:117:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "1237:28:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1254:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1257:1:3",
    											type: "",
    											value: "0"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "1247:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1247:12:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "1247:12:3"
    							}
    						]
    					},
    					name: "revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae",
    					nodeType: "YulFunctionDefinition",
    					src: "1148:117:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "1319:54:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "1329:38:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "1347:5:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "1354:2:3",
    													type: "",
    													value: "31"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "1343:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "1343:14:3"
    										},
    										{
    											"arguments": [
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "1363:2:3",
    													type: "",
    													value: "31"
    												}
    											],
    											functionName: {
    												name: "not",
    												nodeType: "YulIdentifier",
    												src: "1359:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "1359:7:3"
    										}
    									],
    									functionName: {
    										name: "and",
    										nodeType: "YulIdentifier",
    										src: "1339:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1339:28:3"
    								},
    								variableNames: [
    									{
    										name: "result",
    										nodeType: "YulIdentifier",
    										src: "1329:6:3"
    									}
    								]
    							}
    						]
    					},
    					name: "round_up_to_mul_of_32",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "1302:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "result",
    							nodeType: "YulTypedName",
    							src: "1312:6:3",
    							type: ""
    						}
    					],
    					src: "1271:102:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "1407:152:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1424:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1427:77:3",
    											type: "",
    											value: "35408467139433450592217433187231851964531694900788300625387963629091585785856"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "1417:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1417:88:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "1417:88:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1521:1:3",
    											type: "",
    											value: "4"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1524:4:3",
    											type: "",
    											value: "0x41"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "1514:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1514:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "1514:15:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1545:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1548:4:3",
    											type: "",
    											value: "0x24"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "1538:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1538:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "1538:15:3"
    							}
    						]
    					},
    					name: "panic_error_0x41",
    					nodeType: "YulFunctionDefinition",
    					src: "1379:180:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "1608:238:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "1618:58:3",
    								value: {
    									"arguments": [
    										{
    											name: "memPtr",
    											nodeType: "YulIdentifier",
    											src: "1640:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "size",
    													nodeType: "YulIdentifier",
    													src: "1670:4:3"
    												}
    											],
    											functionName: {
    												name: "round_up_to_mul_of_32",
    												nodeType: "YulIdentifier",
    												src: "1648:21:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "1648:27:3"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "1636:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1636:40:3"
    								},
    								variables: [
    									{
    										name: "newFreePtr",
    										nodeType: "YulTypedName",
    										src: "1622:10:3",
    										type: ""
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "1787:22:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x41",
    													nodeType: "YulIdentifier",
    													src: "1789:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "1789:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "1789:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "newFreePtr",
    													nodeType: "YulIdentifier",
    													src: "1730:10:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "1742:18:3",
    													type: "",
    													value: "0xffffffffffffffff"
    												}
    											],
    											functionName: {
    												name: "gt",
    												nodeType: "YulIdentifier",
    												src: "1727:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "1727:34:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "newFreePtr",
    													nodeType: "YulIdentifier",
    													src: "1766:10:3"
    												},
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "1778:6:3"
    												}
    											],
    											functionName: {
    												name: "lt",
    												nodeType: "YulIdentifier",
    												src: "1763:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "1763:22:3"
    										}
    									],
    									functionName: {
    										name: "or",
    										nodeType: "YulIdentifier",
    										src: "1724:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1724:62:3"
    								},
    								nodeType: "YulIf",
    								src: "1721:88:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "1825:2:3",
    											type: "",
    											value: "64"
    										},
    										{
    											name: "newFreePtr",
    											nodeType: "YulIdentifier",
    											src: "1829:10:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "1818:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1818:22:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "1818:22:3"
    							}
    						]
    					},
    					name: "finalize_allocation",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "1594:6:3",
    							type: ""
    						},
    						{
    							name: "size",
    							nodeType: "YulTypedName",
    							src: "1602:4:3",
    							type: ""
    						}
    					],
    					src: "1565:281:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "1893:88:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "1903:30:3",
    								value: {
    									"arguments": [
    									],
    									functionName: {
    										name: "allocate_unbounded",
    										nodeType: "YulIdentifier",
    										src: "1913:18:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1913:20:3"
    								},
    								variableNames: [
    									{
    										name: "memPtr",
    										nodeType: "YulIdentifier",
    										src: "1903:6:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "memPtr",
    											nodeType: "YulIdentifier",
    											src: "1962:6:3"
    										},
    										{
    											name: "size",
    											nodeType: "YulIdentifier",
    											src: "1970:4:3"
    										}
    									],
    									functionName: {
    										name: "finalize_allocation",
    										nodeType: "YulIdentifier",
    										src: "1942:19:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "1942:33:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "1942:33:3"
    							}
    						]
    					},
    					name: "allocate_memory",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "size",
    							nodeType: "YulTypedName",
    							src: "1877:4:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "1886:6:3",
    							type: ""
    						}
    					],
    					src: "1852:129:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "2054:241:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "2159:22:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x41",
    													nodeType: "YulIdentifier",
    													src: "2161:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "2161:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "2161:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "2131:6:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "2139:18:3",
    											type: "",
    											value: "0xffffffffffffffff"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "2128:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2128:30:3"
    								},
    								nodeType: "YulIf",
    								src: "2125:56:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "2191:37:3",
    								value: {
    									"arguments": [
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "2221:6:3"
    										}
    									],
    									functionName: {
    										name: "round_up_to_mul_of_32",
    										nodeType: "YulIdentifier",
    										src: "2199:21:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2199:29:3"
    								},
    								variableNames: [
    									{
    										name: "size",
    										nodeType: "YulIdentifier",
    										src: "2191:4:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "2265:23:3",
    								value: {
    									"arguments": [
    										{
    											name: "size",
    											nodeType: "YulIdentifier",
    											src: "2277:4:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "2283:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "2273:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2273:15:3"
    								},
    								variableNames: [
    									{
    										name: "size",
    										nodeType: "YulIdentifier",
    										src: "2265:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "array_allocation_size_t_string_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "2038:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "size",
    							nodeType: "YulTypedName",
    							src: "2049:4:3",
    							type: ""
    						}
    					],
    					src: "1987:308:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "2365:82:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "dst",
    											nodeType: "YulIdentifier",
    											src: "2388:3:3"
    										},
    										{
    											name: "src",
    											nodeType: "YulIdentifier",
    											src: "2393:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "2398:6:3"
    										}
    									],
    									functionName: {
    										name: "calldatacopy",
    										nodeType: "YulIdentifier",
    										src: "2375:12:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2375:30:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "2375:30:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "dst",
    													nodeType: "YulIdentifier",
    													src: "2425:3:3"
    												},
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "2430:6:3"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "2421:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "2421:16:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "2439:1:3",
    											type: "",
    											value: "0"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "2414:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2414:27:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "2414:27:3"
    							}
    						]
    					},
    					name: "copy_calldata_to_memory_with_cleanup",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "src",
    							nodeType: "YulTypedName",
    							src: "2347:3:3",
    							type: ""
    						},
    						{
    							name: "dst",
    							nodeType: "YulTypedName",
    							src: "2352:3:3",
    							type: ""
    						},
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "2357:6:3",
    							type: ""
    						}
    					],
    					src: "2301:146:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "2537:341:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "2547:75:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "2614:6:3"
    												}
    											],
    											functionName: {
    												name: "array_allocation_size_t_string_memory_ptr",
    												nodeType: "YulIdentifier",
    												src: "2572:41:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "2572:49:3"
    										}
    									],
    									functionName: {
    										name: "allocate_memory",
    										nodeType: "YulIdentifier",
    										src: "2556:15:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2556:66:3"
    								},
    								variableNames: [
    									{
    										name: "array",
    										nodeType: "YulIdentifier",
    										src: "2547:5:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "array",
    											nodeType: "YulIdentifier",
    											src: "2638:5:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "2645:6:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "2631:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2631:21:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "2631:21:3"
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "2661:27:3",
    								value: {
    									"arguments": [
    										{
    											name: "array",
    											nodeType: "YulIdentifier",
    											src: "2676:5:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "2683:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "2672:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2672:16:3"
    								},
    								variables: [
    									{
    										name: "dst",
    										nodeType: "YulTypedName",
    										src: "2665:3:3",
    										type: ""
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "2726:83:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae",
    													nodeType: "YulIdentifier",
    													src: "2728:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "2728:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "2728:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "src",
    													nodeType: "YulIdentifier",
    													src: "2707:3:3"
    												},
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "2712:6:3"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "2703:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "2703:16:3"
    										},
    										{
    											name: "end",
    											nodeType: "YulIdentifier",
    											src: "2721:3:3"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "2700:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2700:25:3"
    								},
    								nodeType: "YulIf",
    								src: "2697:112:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "src",
    											nodeType: "YulIdentifier",
    											src: "2855:3:3"
    										},
    										{
    											name: "dst",
    											nodeType: "YulIdentifier",
    											src: "2860:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "2865:6:3"
    										}
    									],
    									functionName: {
    										name: "copy_calldata_to_memory_with_cleanup",
    										nodeType: "YulIdentifier",
    										src: "2818:36:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2818:54:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "2818:54:3"
    							}
    						]
    					},
    					name: "abi_decode_available_length_t_string_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "src",
    							nodeType: "YulTypedName",
    							src: "2510:3:3",
    							type: ""
    						},
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "2515:6:3",
    							type: ""
    						},
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "2523:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "array",
    							nodeType: "YulTypedName",
    							src: "2531:5:3",
    							type: ""
    						}
    					],
    					src: "2453:425:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "2960:278:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "3009:83:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d",
    													nodeType: "YulIdentifier",
    													src: "3011:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "3011:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "3011:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "offset",
    															nodeType: "YulIdentifier",
    															src: "2988:6:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "2996:4:3",
    															type: "",
    															value: "0x1f"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "2984:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "2984:17:3"
    												},
    												{
    													name: "end",
    													nodeType: "YulIdentifier",
    													src: "3003:3:3"
    												}
    											],
    											functionName: {
    												name: "slt",
    												nodeType: "YulIdentifier",
    												src: "2980:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "2980:27:3"
    										}
    									],
    									functionName: {
    										name: "iszero",
    										nodeType: "YulIdentifier",
    										src: "2973:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "2973:35:3"
    								},
    								nodeType: "YulIf",
    								src: "2970:122:3"
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "3101:34:3",
    								value: {
    									"arguments": [
    										{
    											name: "offset",
    											nodeType: "YulIdentifier",
    											src: "3128:6:3"
    										}
    									],
    									functionName: {
    										name: "calldataload",
    										nodeType: "YulIdentifier",
    										src: "3115:12:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "3115:20:3"
    								},
    								variables: [
    									{
    										name: "length",
    										nodeType: "YulTypedName",
    										src: "3105:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "3144:88:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "offset",
    													nodeType: "YulIdentifier",
    													src: "3205:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "3213:4:3",
    													type: "",
    													value: "0x20"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "3201:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "3201:17:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "3220:6:3"
    										},
    										{
    											name: "end",
    											nodeType: "YulIdentifier",
    											src: "3228:3:3"
    										}
    									],
    									functionName: {
    										name: "abi_decode_available_length_t_string_memory_ptr",
    										nodeType: "YulIdentifier",
    										src: "3153:47:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "3153:79:3"
    								},
    								variableNames: [
    									{
    										name: "array",
    										nodeType: "YulIdentifier",
    										src: "3144:5:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_decode_t_string_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "offset",
    							nodeType: "YulTypedName",
    							src: "2938:6:3",
    							type: ""
    						},
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "2946:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "array",
    							nodeType: "YulTypedName",
    							src: "2954:5:3",
    							type: ""
    						}
    					],
    					src: "2898:340:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "3320:433:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "3366:83:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b",
    													nodeType: "YulIdentifier",
    													src: "3368:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "3368:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "3368:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "3341:7:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "3350:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "3337:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "3337:23:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "3362:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "slt",
    										nodeType: "YulIdentifier",
    										src: "3333:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "3333:32:3"
    								},
    								nodeType: "YulIf",
    								src: "3330:119:3"
    							},
    							{
    								nodeType: "YulBlock",
    								src: "3459:287:3",
    								statements: [
    									{
    										nodeType: "YulVariableDeclaration",
    										src: "3474:45:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "headStart",
    															nodeType: "YulIdentifier",
    															src: "3505:9:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "3516:1:3",
    															type: "",
    															value: "0"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "3501:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "3501:17:3"
    												}
    											],
    											functionName: {
    												name: "calldataload",
    												nodeType: "YulIdentifier",
    												src: "3488:12:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "3488:31:3"
    										},
    										variables: [
    											{
    												name: "offset",
    												nodeType: "YulTypedName",
    												src: "3478:6:3",
    												type: ""
    											}
    										]
    									},
    									{
    										body: {
    											nodeType: "YulBlock",
    											src: "3566:83:3",
    											statements: [
    												{
    													expression: {
    														"arguments": [
    														],
    														functionName: {
    															name: "revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db",
    															nodeType: "YulIdentifier",
    															src: "3568:77:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "3568:79:3"
    													},
    													nodeType: "YulExpressionStatement",
    													src: "3568:79:3"
    												}
    											]
    										},
    										condition: {
    											"arguments": [
    												{
    													name: "offset",
    													nodeType: "YulIdentifier",
    													src: "3538:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "3546:18:3",
    													type: "",
    													value: "0xffffffffffffffff"
    												}
    											],
    											functionName: {
    												name: "gt",
    												nodeType: "YulIdentifier",
    												src: "3535:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "3535:30:3"
    										},
    										nodeType: "YulIf",
    										src: "3532:117:3"
    									},
    									{
    										nodeType: "YulAssignment",
    										src: "3663:73:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "headStart",
    															nodeType: "YulIdentifier",
    															src: "3708:9:3"
    														},
    														{
    															name: "offset",
    															nodeType: "YulIdentifier",
    															src: "3719:6:3"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "3704:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "3704:22:3"
    												},
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "3728:7:3"
    												}
    											],
    											functionName: {
    												name: "abi_decode_t_string_memory_ptr",
    												nodeType: "YulIdentifier",
    												src: "3673:30:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "3673:63:3"
    										},
    										variableNames: [
    											{
    												name: "value0",
    												nodeType: "YulIdentifier",
    												src: "3663:6:3"
    											}
    										]
    									}
    								]
    							}
    						]
    					},
    					name: "abi_decode_tuple_t_string_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "3290:9:3",
    							type: ""
    						},
    						{
    							name: "dataEnd",
    							nodeType: "YulTypedName",
    							src: "3301:7:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "3313:6:3",
    							type: ""
    						}
    					],
    					src: "3244:509:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "3804:81:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "3814:65:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "3829:5:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "3836:42:3",
    											type: "",
    											value: "0xffffffffffffffffffffffffffffffffffffffff"
    										}
    									],
    									functionName: {
    										name: "and",
    										nodeType: "YulIdentifier",
    										src: "3825:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "3825:54:3"
    								},
    								variableNames: [
    									{
    										name: "cleaned",
    										nodeType: "YulIdentifier",
    										src: "3814:7:3"
    									}
    								]
    							}
    						]
    					},
    					name: "cleanup_t_uint160",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "3786:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "cleaned",
    							nodeType: "YulTypedName",
    							src: "3796:7:3",
    							type: ""
    						}
    					],
    					src: "3759:126:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "3936:51:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "3946:35:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "3975:5:3"
    										}
    									],
    									functionName: {
    										name: "cleanup_t_uint160",
    										nodeType: "YulIdentifier",
    										src: "3957:17:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "3957:24:3"
    								},
    								variableNames: [
    									{
    										name: "cleaned",
    										nodeType: "YulIdentifier",
    										src: "3946:7:3"
    									}
    								]
    							}
    						]
    					},
    					name: "cleanup_t_address",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "3918:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "cleaned",
    							nodeType: "YulTypedName",
    							src: "3928:7:3",
    							type: ""
    						}
    					],
    					src: "3891:96:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "4058:53:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "4075:3:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "4098:5:3"
    												}
    											],
    											functionName: {
    												name: "cleanup_t_address",
    												nodeType: "YulIdentifier",
    												src: "4080:17:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "4080:24:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "4068:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4068:37:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "4068:37:3"
    							}
    						]
    					},
    					name: "abi_encode_t_address_to_t_address_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "4046:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "4053:3:3",
    							type: ""
    						}
    					],
    					src: "3993:118:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "4215:124:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "4225:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "4237:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "4248:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "4233:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4233:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "4225:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "4305:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "4318:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "4329:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "4314:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "4314:17:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_address_to_t_address_fromStack",
    										nodeType: "YulIdentifier",
    										src: "4261:43:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4261:71:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "4261:71:3"
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_address__to_t_address__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "4187:9:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "4199:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "4210:4:3",
    							type: ""
    						}
    					],
    					src: "4117:222:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "4404:40:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "4415:22:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "4431:5:3"
    										}
    									],
    									functionName: {
    										name: "mload",
    										nodeType: "YulIdentifier",
    										src: "4425:5:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4425:12:3"
    								},
    								variableNames: [
    									{
    										name: "length",
    										nodeType: "YulIdentifier",
    										src: "4415:6:3"
    									}
    								]
    							}
    						]
    					},
    					name: "array_length_t_string_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "4387:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "4397:6:3",
    							type: ""
    						}
    					],
    					src: "4345:99:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "4536:73:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "4553:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "4558:6:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "4546:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4546:19:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "4546:19:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "4574:29:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "4593:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "4598:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "4589:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4589:14:3"
    								},
    								variableNames: [
    									{
    										name: "updated_pos",
    										nodeType: "YulIdentifier",
    										src: "4574:11:3"
    									}
    								]
    							}
    						]
    					},
    					name: "array_storeLengthForEncoding_t_string_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "4508:3:3",
    							type: ""
    						},
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "4513:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "updated_pos",
    							nodeType: "YulTypedName",
    							src: "4524:11:3",
    							type: ""
    						}
    					],
    					src: "4450:159:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "4677:184:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "4687:10:3",
    								value: {
    									kind: "number",
    									nodeType: "YulLiteral",
    									src: "4696:1:3",
    									type: "",
    									value: "0"
    								},
    								variables: [
    									{
    										name: "i",
    										nodeType: "YulTypedName",
    										src: "4691:1:3",
    										type: ""
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "4756:63:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    													{
    														"arguments": [
    															{
    																name: "dst",
    																nodeType: "YulIdentifier",
    																src: "4781:3:3"
    															},
    															{
    																name: "i",
    																nodeType: "YulIdentifier",
    																src: "4786:1:3"
    															}
    														],
    														functionName: {
    															name: "add",
    															nodeType: "YulIdentifier",
    															src: "4777:3:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "4777:11:3"
    													},
    													{
    														"arguments": [
    															{
    																"arguments": [
    																	{
    																		name: "src",
    																		nodeType: "YulIdentifier",
    																		src: "4800:3:3"
    																	},
    																	{
    																		name: "i",
    																		nodeType: "YulIdentifier",
    																		src: "4805:1:3"
    																	}
    																],
    																functionName: {
    																	name: "add",
    																	nodeType: "YulIdentifier",
    																	src: "4796:3:3"
    																},
    																nodeType: "YulFunctionCall",
    																src: "4796:11:3"
    															}
    														],
    														functionName: {
    															name: "mload",
    															nodeType: "YulIdentifier",
    															src: "4790:5:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "4790:18:3"
    													}
    												],
    												functionName: {
    													name: "mstore",
    													nodeType: "YulIdentifier",
    													src: "4770:6:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "4770:39:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "4770:39:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "i",
    											nodeType: "YulIdentifier",
    											src: "4717:1:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "4720:6:3"
    										}
    									],
    									functionName: {
    										name: "lt",
    										nodeType: "YulIdentifier",
    										src: "4714:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4714:13:3"
    								},
    								nodeType: "YulForLoop",
    								post: {
    									nodeType: "YulBlock",
    									src: "4728:19:3",
    									statements: [
    										{
    											nodeType: "YulAssignment",
    											src: "4730:15:3",
    											value: {
    												"arguments": [
    													{
    														name: "i",
    														nodeType: "YulIdentifier",
    														src: "4739:1:3"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "4742:2:3",
    														type: "",
    														value: "32"
    													}
    												],
    												functionName: {
    													name: "add",
    													nodeType: "YulIdentifier",
    													src: "4735:3:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "4735:10:3"
    											},
    											variableNames: [
    												{
    													name: "i",
    													nodeType: "YulIdentifier",
    													src: "4730:1:3"
    												}
    											]
    										}
    									]
    								},
    								pre: {
    									nodeType: "YulBlock",
    									src: "4710:3:3",
    									statements: [
    									]
    								},
    								src: "4706:113:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "dst",
    													nodeType: "YulIdentifier",
    													src: "4839:3:3"
    												},
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "4844:6:3"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "4835:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "4835:16:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "4853:1:3",
    											type: "",
    											value: "0"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "4828:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4828:27:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "4828:27:3"
    							}
    						]
    					},
    					name: "copy_memory_to_memory_with_cleanup",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "src",
    							nodeType: "YulTypedName",
    							src: "4659:3:3",
    							type: ""
    						},
    						{
    							name: "dst",
    							nodeType: "YulTypedName",
    							src: "4664:3:3",
    							type: ""
    						},
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "4669:6:3",
    							type: ""
    						}
    					],
    					src: "4615:246:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "4949:275:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "4959:53:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "5006:5:3"
    										}
    									],
    									functionName: {
    										name: "array_length_t_string_memory_ptr",
    										nodeType: "YulIdentifier",
    										src: "4973:32:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "4973:39:3"
    								},
    								variables: [
    									{
    										name: "length",
    										nodeType: "YulTypedName",
    										src: "4963:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "5021:68:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "5077:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "5082:6:3"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr",
    										nodeType: "YulIdentifier",
    										src: "5028:48:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "5028:61:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "5021:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "5137:5:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "5144:4:3",
    													type: "",
    													value: "0x20"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "5133:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5133:16:3"
    										},
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "5151:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "5156:6:3"
    										}
    									],
    									functionName: {
    										name: "copy_memory_to_memory_with_cleanup",
    										nodeType: "YulIdentifier",
    										src: "5098:34:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "5098:65:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "5098:65:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "5172:46:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "5183:3:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "5210:6:3"
    												}
    											],
    											functionName: {
    												name: "round_up_to_mul_of_32",
    												nodeType: "YulIdentifier",
    												src: "5188:21:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5188:29:3"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "5179:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "5179:39:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "5172:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_string_memory_ptr_to_t_string_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "4930:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "4937:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "4945:3:3",
    							type: ""
    						}
    					],
    					src: "4867:357:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "5285:53:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "5302:3:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "5325:5:3"
    												}
    											],
    											functionName: {
    												name: "cleanup_t_uint256",
    												nodeType: "YulIdentifier",
    												src: "5307:17:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5307:24:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "5295:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "5295:37:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "5295:37:3"
    							}
    						]
    					},
    					name: "abi_encode_t_uint256_to_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "5273:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "5280:3:3",
    							type: ""
    						}
    					],
    					src: "5230:108:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "5524:494:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "5534:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "5550:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "5555:4:3",
    											type: "",
    											value: "0x40"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "5546:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "5546:14:3"
    								},
    								variables: [
    									{
    										name: "tail",
    										nodeType: "YulTypedName",
    										src: "5538:4:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulBlock",
    								src: "5570:242:3",
    								statements: [
    									{
    										nodeType: "YulVariableDeclaration",
    										src: "5612:43:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "value",
    															nodeType: "YulIdentifier",
    															src: "5642:5:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "5649:4:3",
    															type: "",
    															value: "0x00"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "5638:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "5638:16:3"
    												}
    											],
    											functionName: {
    												name: "mload",
    												nodeType: "YulIdentifier",
    												src: "5632:5:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5632:23:3"
    										},
    										variables: [
    											{
    												name: "memberValue0",
    												nodeType: "YulTypedName",
    												src: "5616:12:3",
    												type: ""
    											}
    										]
    									},
    									{
    										expression: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "pos",
    															nodeType: "YulIdentifier",
    															src: "5680:3:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "5685:4:3",
    															type: "",
    															value: "0x00"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "5676:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "5676:14:3"
    												},
    												{
    													"arguments": [
    														{
    															name: "tail",
    															nodeType: "YulIdentifier",
    															src: "5696:4:3"
    														},
    														{
    															name: "pos",
    															nodeType: "YulIdentifier",
    															src: "5702:3:3"
    														}
    													],
    													functionName: {
    														name: "sub",
    														nodeType: "YulIdentifier",
    														src: "5692:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "5692:14:3"
    												}
    											],
    											functionName: {
    												name: "mstore",
    												nodeType: "YulIdentifier",
    												src: "5669:6:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5669:38:3"
    										},
    										nodeType: "YulExpressionStatement",
    										src: "5669:38:3"
    									},
    									{
    										nodeType: "YulAssignment",
    										src: "5720:81:3",
    										value: {
    											"arguments": [
    												{
    													name: "memberValue0",
    													nodeType: "YulIdentifier",
    													src: "5782:12:3"
    												},
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "5796:4:3"
    												}
    											],
    											functionName: {
    												name: "abi_encode_t_string_memory_ptr_to_t_string_memory_ptr",
    												nodeType: "YulIdentifier",
    												src: "5728:53:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5728:73:3"
    										},
    										variableNames: [
    											{
    												name: "tail",
    												nodeType: "YulIdentifier",
    												src: "5720:4:3"
    											}
    										]
    									}
    								]
    							},
    							{
    								nodeType: "YulBlock",
    								src: "5822:169:3",
    								statements: [
    									{
    										nodeType: "YulVariableDeclaration",
    										src: "5862:43:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "value",
    															nodeType: "YulIdentifier",
    															src: "5892:5:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "5899:4:3",
    															type: "",
    															value: "0x20"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "5888:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "5888:16:3"
    												}
    											],
    											functionName: {
    												name: "mload",
    												nodeType: "YulIdentifier",
    												src: "5882:5:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5882:23:3"
    										},
    										variables: [
    											{
    												name: "memberValue0",
    												nodeType: "YulTypedName",
    												src: "5866:12:3",
    												type: ""
    											}
    										]
    									},
    									{
    										expression: {
    											"arguments": [
    												{
    													name: "memberValue0",
    													nodeType: "YulIdentifier",
    													src: "5952:12:3"
    												},
    												{
    													"arguments": [
    														{
    															name: "pos",
    															nodeType: "YulIdentifier",
    															src: "5970:3:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "5975:4:3",
    															type: "",
    															value: "0x20"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "5966:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "5966:14:3"
    												}
    											],
    											functionName: {
    												name: "abi_encode_t_uint256_to_t_uint256",
    												nodeType: "YulIdentifier",
    												src: "5918:33:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "5918:63:3"
    										},
    										nodeType: "YulExpressionStatement",
    										src: "5918:63:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "6001:11:3",
    								value: {
    									name: "tail",
    									nodeType: "YulIdentifier",
    									src: "6008:4:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "6001:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_struct$_Proposal_$152_memory_ptr_to_t_struct$_Proposal_$152_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "5503:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "5510:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "5519:3:3",
    							type: ""
    						}
    					],
    					src: "5400:618:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "6172:225:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "6182:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "6194:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "6205:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "6190:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6190:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "6182:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "6229:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "6240:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "6225:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "6225:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "6248:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "6254:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "6244:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "6244:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "6218:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6218:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "6218:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "6274:116:3",
    								value: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "6376:6:3"
    										},
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "6385:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_struct$_Proposal_$152_memory_ptr_to_t_struct$_Proposal_$152_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "6282:93:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6282:108:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "6274:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_struct$_Proposal_$152_memory_ptr__to_t_struct$_Proposal_$152_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "6144:9:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "6156:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "6167:4:3",
    							type: ""
    						}
    					],
    					src: "6024:373:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "6468:53:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "6485:3:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "6508:5:3"
    												}
    											],
    											functionName: {
    												name: "cleanup_t_uint256",
    												nodeType: "YulIdentifier",
    												src: "6490:17:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "6490:24:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "6478:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6478:37:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "6478:37:3"
    							}
    						]
    					},
    					name: "abi_encode_t_uint256_to_t_uint256_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "6456:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "6463:3:3",
    							type: ""
    						}
    					],
    					src: "6403:118:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "6625:124:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "6635:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "6647:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "6658:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "6643:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6643:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "6635:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "6715:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "6728:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "6739:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "6724:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "6724:17:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_uint256_to_t_uint256_fromStack",
    										nodeType: "YulIdentifier",
    										src: "6671:43:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6671:71:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "6671:71:3"
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_uint256__to_t_uint256__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "6597:9:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "6609:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "6620:4:3",
    							type: ""
    						}
    					],
    					src: "6527:222:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "6837:229:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "6942:22:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x41",
    													nodeType: "YulIdentifier",
    													src: "6944:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "6944:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "6944:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "6914:6:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "6922:18:3",
    											type: "",
    											value: "0xffffffffffffffff"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "6911:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6911:30:3"
    								},
    								nodeType: "YulIf",
    								src: "6908:56:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "6974:25:3",
    								value: {
    									"arguments": [
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "6986:6:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "6994:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "mul",
    										nodeType: "YulIdentifier",
    										src: "6982:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "6982:17:3"
    								},
    								variableNames: [
    									{
    										name: "size",
    										nodeType: "YulIdentifier",
    										src: "6974:4:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "7036:23:3",
    								value: {
    									"arguments": [
    										{
    											name: "size",
    											nodeType: "YulIdentifier",
    											src: "7048:4:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "7054:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "7044:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7044:15:3"
    								},
    								variableNames: [
    									{
    										name: "size",
    										nodeType: "YulIdentifier",
    										src: "7036:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "array_allocation_size_t_array$_t_address_$dyn_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "6821:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "size",
    							nodeType: "YulTypedName",
    							src: "6832:4:3",
    							type: ""
    						}
    					],
    					src: "6755:311:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "7161:28:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "7178:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "7181:1:3",
    											type: "",
    											value: "0"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "7171:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7171:12:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "7171:12:3"
    							}
    						]
    					},
    					name: "revert_error_81385d8c0b31fffe14be1da910c8bd3a80be4cfa248e04f42ec0faea3132a8ef",
    					nodeType: "YulFunctionDefinition",
    					src: "7072:117:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "7238:79:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "7295:16:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "7304:1:3",
    														type: "",
    														value: "0"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "7307:1:3",
    														type: "",
    														value: "0"
    													}
    												],
    												functionName: {
    													name: "revert",
    													nodeType: "YulIdentifier",
    													src: "7297:6:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "7297:12:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "7297:12:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "7261:5:3"
    												},
    												{
    													"arguments": [
    														{
    															name: "value",
    															nodeType: "YulIdentifier",
    															src: "7286:5:3"
    														}
    													],
    													functionName: {
    														name: "cleanup_t_address",
    														nodeType: "YulIdentifier",
    														src: "7268:17:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "7268:24:3"
    												}
    											],
    											functionName: {
    												name: "eq",
    												nodeType: "YulIdentifier",
    												src: "7258:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "7258:35:3"
    										}
    									],
    									functionName: {
    										name: "iszero",
    										nodeType: "YulIdentifier",
    										src: "7251:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7251:43:3"
    								},
    								nodeType: "YulIf",
    								src: "7248:63:3"
    							}
    						]
    					},
    					name: "validator_revert_t_address",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "7231:5:3",
    							type: ""
    						}
    					],
    					src: "7195:122:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "7375:87:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "7385:29:3",
    								value: {
    									"arguments": [
    										{
    											name: "offset",
    											nodeType: "YulIdentifier",
    											src: "7407:6:3"
    										}
    									],
    									functionName: {
    										name: "calldataload",
    										nodeType: "YulIdentifier",
    										src: "7394:12:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7394:20:3"
    								},
    								variableNames: [
    									{
    										name: "value",
    										nodeType: "YulIdentifier",
    										src: "7385:5:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "7450:5:3"
    										}
    									],
    									functionName: {
    										name: "validator_revert_t_address",
    										nodeType: "YulIdentifier",
    										src: "7423:26:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7423:33:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "7423:33:3"
    							}
    						]
    					},
    					name: "abi_decode_t_address",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "offset",
    							nodeType: "YulTypedName",
    							src: "7353:6:3",
    							type: ""
    						},
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "7361:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "7369:5:3",
    							type: ""
    						}
    					],
    					src: "7323:139:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "7587:608:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "7597:90:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "7679:6:3"
    												}
    											],
    											functionName: {
    												name: "array_allocation_size_t_array$_t_address_$dyn_memory_ptr",
    												nodeType: "YulIdentifier",
    												src: "7622:56:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "7622:64:3"
    										}
    									],
    									functionName: {
    										name: "allocate_memory",
    										nodeType: "YulIdentifier",
    										src: "7606:15:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7606:81:3"
    								},
    								variableNames: [
    									{
    										name: "array",
    										nodeType: "YulIdentifier",
    										src: "7597:5:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "7696:16:3",
    								value: {
    									name: "array",
    									nodeType: "YulIdentifier",
    									src: "7707:5:3"
    								},
    								variables: [
    									{
    										name: "dst",
    										nodeType: "YulTypedName",
    										src: "7700:3:3",
    										type: ""
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "array",
    											nodeType: "YulIdentifier",
    											src: "7729:5:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "7736:6:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "7722:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7722:21:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "7722:21:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "7752:23:3",
    								value: {
    									"arguments": [
    										{
    											name: "array",
    											nodeType: "YulIdentifier",
    											src: "7763:5:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "7770:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "7759:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7759:16:3"
    								},
    								variableNames: [
    									{
    										name: "dst",
    										nodeType: "YulIdentifier",
    										src: "7752:3:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "7785:44:3",
    								value: {
    									"arguments": [
    										{
    											name: "offset",
    											nodeType: "YulIdentifier",
    											src: "7803:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "7815:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "7823:4:3",
    													type: "",
    													value: "0x20"
    												}
    											],
    											functionName: {
    												name: "mul",
    												nodeType: "YulIdentifier",
    												src: "7811:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "7811:17:3"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "7799:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7799:30:3"
    								},
    								variables: [
    									{
    										name: "srcEnd",
    										nodeType: "YulTypedName",
    										src: "7789:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "7857:103:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_81385d8c0b31fffe14be1da910c8bd3a80be4cfa248e04f42ec0faea3132a8ef",
    													nodeType: "YulIdentifier",
    													src: "7871:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "7871:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "7871:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "srcEnd",
    											nodeType: "YulIdentifier",
    											src: "7844:6:3"
    										},
    										{
    											name: "end",
    											nodeType: "YulIdentifier",
    											src: "7852:3:3"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "7841:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7841:15:3"
    								},
    								nodeType: "YulIf",
    								src: "7838:122:3"
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "8045:144:3",
    									statements: [
    										{
    											nodeType: "YulVariableDeclaration",
    											src: "8060:21:3",
    											value: {
    												name: "src",
    												nodeType: "YulIdentifier",
    												src: "8078:3:3"
    											},
    											variables: [
    												{
    													name: "elementPos",
    													nodeType: "YulTypedName",
    													src: "8064:10:3",
    													type: ""
    												}
    											]
    										},
    										{
    											expression: {
    												"arguments": [
    													{
    														name: "dst",
    														nodeType: "YulIdentifier",
    														src: "8102:3:3"
    													},
    													{
    														"arguments": [
    															{
    																name: "elementPos",
    																nodeType: "YulIdentifier",
    																src: "8128:10:3"
    															},
    															{
    																name: "end",
    																nodeType: "YulIdentifier",
    																src: "8140:3:3"
    															}
    														],
    														functionName: {
    															name: "abi_decode_t_address",
    															nodeType: "YulIdentifier",
    															src: "8107:20:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "8107:37:3"
    													}
    												],
    												functionName: {
    													name: "mstore",
    													nodeType: "YulIdentifier",
    													src: "8095:6:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "8095:50:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "8095:50:3"
    										},
    										{
    											nodeType: "YulAssignment",
    											src: "8158:21:3",
    											value: {
    												"arguments": [
    													{
    														name: "dst",
    														nodeType: "YulIdentifier",
    														src: "8169:3:3"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "8174:4:3",
    														type: "",
    														value: "0x20"
    													}
    												],
    												functionName: {
    													name: "add",
    													nodeType: "YulIdentifier",
    													src: "8165:3:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "8165:14:3"
    											},
    											variableNames: [
    												{
    													name: "dst",
    													nodeType: "YulIdentifier",
    													src: "8158:3:3"
    												}
    											]
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "src",
    											nodeType: "YulIdentifier",
    											src: "7998:3:3"
    										},
    										{
    											name: "srcEnd",
    											nodeType: "YulIdentifier",
    											src: "8003:6:3"
    										}
    									],
    									functionName: {
    										name: "lt",
    										nodeType: "YulIdentifier",
    										src: "7995:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "7995:15:3"
    								},
    								nodeType: "YulForLoop",
    								post: {
    									nodeType: "YulBlock",
    									src: "8011:25:3",
    									statements: [
    										{
    											nodeType: "YulAssignment",
    											src: "8013:21:3",
    											value: {
    												"arguments": [
    													{
    														name: "src",
    														nodeType: "YulIdentifier",
    														src: "8024:3:3"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "8029:4:3",
    														type: "",
    														value: "0x20"
    													}
    												],
    												functionName: {
    													name: "add",
    													nodeType: "YulIdentifier",
    													src: "8020:3:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "8020:14:3"
    											},
    											variableNames: [
    												{
    													name: "src",
    													nodeType: "YulIdentifier",
    													src: "8013:3:3"
    												}
    											]
    										}
    									]
    								},
    								pre: {
    									nodeType: "YulBlock",
    									src: "7973:21:3",
    									statements: [
    										{
    											nodeType: "YulVariableDeclaration",
    											src: "7975:17:3",
    											value: {
    												name: "offset",
    												nodeType: "YulIdentifier",
    												src: "7986:6:3"
    											},
    											variables: [
    												{
    													name: "src",
    													nodeType: "YulTypedName",
    													src: "7979:3:3",
    													type: ""
    												}
    											]
    										}
    									]
    								},
    								src: "7969:220:3"
    							}
    						]
    					},
    					name: "abi_decode_available_length_t_array$_t_address_$dyn_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "offset",
    							nodeType: "YulTypedName",
    							src: "7557:6:3",
    							type: ""
    						},
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "7565:6:3",
    							type: ""
    						},
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "7573:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "array",
    							nodeType: "YulTypedName",
    							src: "7581:5:3",
    							type: ""
    						}
    					],
    					src: "7485:710:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "8295:293:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "8344:83:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d",
    													nodeType: "YulIdentifier",
    													src: "8346:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "8346:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "8346:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "offset",
    															nodeType: "YulIdentifier",
    															src: "8323:6:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "8331:4:3",
    															type: "",
    															value: "0x1f"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "8319:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "8319:17:3"
    												},
    												{
    													name: "end",
    													nodeType: "YulIdentifier",
    													src: "8338:3:3"
    												}
    											],
    											functionName: {
    												name: "slt",
    												nodeType: "YulIdentifier",
    												src: "8315:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "8315:27:3"
    										}
    									],
    									functionName: {
    										name: "iszero",
    										nodeType: "YulIdentifier",
    										src: "8308:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "8308:35:3"
    								},
    								nodeType: "YulIf",
    								src: "8305:122:3"
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "8436:34:3",
    								value: {
    									"arguments": [
    										{
    											name: "offset",
    											nodeType: "YulIdentifier",
    											src: "8463:6:3"
    										}
    									],
    									functionName: {
    										name: "calldataload",
    										nodeType: "YulIdentifier",
    										src: "8450:12:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "8450:20:3"
    								},
    								variables: [
    									{
    										name: "length",
    										nodeType: "YulTypedName",
    										src: "8440:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "8479:103:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "offset",
    													nodeType: "YulIdentifier",
    													src: "8555:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "8563:4:3",
    													type: "",
    													value: "0x20"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "8551:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "8551:17:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "8570:6:3"
    										},
    										{
    											name: "end",
    											nodeType: "YulIdentifier",
    											src: "8578:3:3"
    										}
    									],
    									functionName: {
    										name: "abi_decode_available_length_t_array$_t_address_$dyn_memory_ptr",
    										nodeType: "YulIdentifier",
    										src: "8488:62:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "8488:94:3"
    								},
    								variableNames: [
    									{
    										name: "array",
    										nodeType: "YulIdentifier",
    										src: "8479:5:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_decode_t_array$_t_address_$dyn_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "offset",
    							nodeType: "YulTypedName",
    							src: "8273:6:3",
    							type: ""
    						},
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "8281:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "array",
    							nodeType: "YulTypedName",
    							src: "8289:5:3",
    							type: ""
    						}
    					],
    					src: "8218:370:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "8685:448:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "8731:83:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b",
    													nodeType: "YulIdentifier",
    													src: "8733:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "8733:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "8733:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "8706:7:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "8715:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "8702:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "8702:23:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "8727:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "slt",
    										nodeType: "YulIdentifier",
    										src: "8698:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "8698:32:3"
    								},
    								nodeType: "YulIf",
    								src: "8695:119:3"
    							},
    							{
    								nodeType: "YulBlock",
    								src: "8824:302:3",
    								statements: [
    									{
    										nodeType: "YulVariableDeclaration",
    										src: "8839:45:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "headStart",
    															nodeType: "YulIdentifier",
    															src: "8870:9:3"
    														},
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "8881:1:3",
    															type: "",
    															value: "0"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "8866:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "8866:17:3"
    												}
    											],
    											functionName: {
    												name: "calldataload",
    												nodeType: "YulIdentifier",
    												src: "8853:12:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "8853:31:3"
    										},
    										variables: [
    											{
    												name: "offset",
    												nodeType: "YulTypedName",
    												src: "8843:6:3",
    												type: ""
    											}
    										]
    									},
    									{
    										body: {
    											nodeType: "YulBlock",
    											src: "8931:83:3",
    											statements: [
    												{
    													expression: {
    														"arguments": [
    														],
    														functionName: {
    															name: "revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db",
    															nodeType: "YulIdentifier",
    															src: "8933:77:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "8933:79:3"
    													},
    													nodeType: "YulExpressionStatement",
    													src: "8933:79:3"
    												}
    											]
    										},
    										condition: {
    											"arguments": [
    												{
    													name: "offset",
    													nodeType: "YulIdentifier",
    													src: "8903:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "8911:18:3",
    													type: "",
    													value: "0xffffffffffffffff"
    												}
    											],
    											functionName: {
    												name: "gt",
    												nodeType: "YulIdentifier",
    												src: "8900:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "8900:30:3"
    										},
    										nodeType: "YulIf",
    										src: "8897:117:3"
    									},
    									{
    										nodeType: "YulAssignment",
    										src: "9028:88:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "headStart",
    															nodeType: "YulIdentifier",
    															src: "9088:9:3"
    														},
    														{
    															name: "offset",
    															nodeType: "YulIdentifier",
    															src: "9099:6:3"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "9084:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "9084:22:3"
    												},
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "9108:7:3"
    												}
    											],
    											functionName: {
    												name: "abi_decode_t_array$_t_address_$dyn_memory_ptr",
    												nodeType: "YulIdentifier",
    												src: "9038:45:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "9038:78:3"
    										},
    										variableNames: [
    											{
    												name: "value0",
    												nodeType: "YulIdentifier",
    												src: "9028:6:3"
    											}
    										]
    									}
    								]
    							}
    						]
    					},
    					name: "abi_decode_tuple_t_array$_t_address_$dyn_memory_ptr",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "8655:9:3",
    							type: ""
    						},
    						{
    							name: "dataEnd",
    							nodeType: "YulTypedName",
    							src: "8666:7:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "8678:6:3",
    							type: ""
    						}
    					],
    					src: "8594:539:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "9205:263:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "9251:83:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b",
    													nodeType: "YulIdentifier",
    													src: "9253:77:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "9253:79:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "9253:79:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "9226:7:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "9235:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "9222:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "9222:23:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9247:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "slt",
    										nodeType: "YulIdentifier",
    										src: "9218:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "9218:32:3"
    								},
    								nodeType: "YulIf",
    								src: "9215:119:3"
    							},
    							{
    								nodeType: "YulBlock",
    								src: "9344:117:3",
    								statements: [
    									{
    										nodeType: "YulVariableDeclaration",
    										src: "9359:15:3",
    										value: {
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9373:1:3",
    											type: "",
    											value: "0"
    										},
    										variables: [
    											{
    												name: "offset",
    												nodeType: "YulTypedName",
    												src: "9363:6:3",
    												type: ""
    											}
    										]
    									},
    									{
    										nodeType: "YulAssignment",
    										src: "9388:63:3",
    										value: {
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "headStart",
    															nodeType: "YulIdentifier",
    															src: "9423:9:3"
    														},
    														{
    															name: "offset",
    															nodeType: "YulIdentifier",
    															src: "9434:6:3"
    														}
    													],
    													functionName: {
    														name: "add",
    														nodeType: "YulIdentifier",
    														src: "9419:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "9419:22:3"
    												},
    												{
    													name: "dataEnd",
    													nodeType: "YulIdentifier",
    													src: "9443:7:3"
    												}
    											],
    											functionName: {
    												name: "abi_decode_t_address",
    												nodeType: "YulIdentifier",
    												src: "9398:20:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "9398:53:3"
    										},
    										variableNames: [
    											{
    												name: "value0",
    												nodeType: "YulIdentifier",
    												src: "9388:6:3"
    											}
    										]
    									}
    								]
    							}
    						]
    					},
    					name: "abi_decode_tuple_t_address",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "9175:9:3",
    							type: ""
    						},
    						{
    							name: "dataEnd",
    							nodeType: "YulTypedName",
    							src: "9186:7:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "9198:6:3",
    							type: ""
    						}
    					],
    					src: "9139:329:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "9502:152:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9519:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9522:77:3",
    											type: "",
    											value: "35408467139433450592217433187231851964531694900788300625387963629091585785856"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "9512:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "9512:88:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "9512:88:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9616:1:3",
    											type: "",
    											value: "4"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9619:4:3",
    											type: "",
    											value: "0x21"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "9609:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "9609:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "9609:15:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9640:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "9643:4:3",
    											type: "",
    											value: "0x24"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "9633:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "9633:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "9633:15:3"
    							}
    						]
    					},
    					name: "panic_error_0x21",
    					nodeType: "YulFunctionDefinition",
    					src: "9474:180:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "9721:62:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "9755:22:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x21",
    													nodeType: "YulIdentifier",
    													src: "9757:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "9757:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "9757:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "9744:5:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "9751:1:3",
    													type: "",
    													value: "6"
    												}
    											],
    											functionName: {
    												name: "lt",
    												nodeType: "YulIdentifier",
    												src: "9741:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "9741:12:3"
    										}
    									],
    									functionName: {
    										name: "iszero",
    										nodeType: "YulIdentifier",
    										src: "9734:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "9734:20:3"
    								},
    								nodeType: "YulIf",
    								src: "9731:46:3"
    							}
    						]
    					},
    					name: "validator_assert_t_enum$_WorkflowStatus_$159",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "9714:5:3",
    							type: ""
    						}
    					],
    					src: "9660:123:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "9852:84:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "9862:16:3",
    								value: {
    									name: "value",
    									nodeType: "YulIdentifier",
    									src: "9873:5:3"
    								},
    								variableNames: [
    									{
    										name: "cleaned",
    										nodeType: "YulIdentifier",
    										src: "9862:7:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "9924:5:3"
    										}
    									],
    									functionName: {
    										name: "validator_assert_t_enum$_WorkflowStatus_$159",
    										nodeType: "YulIdentifier",
    										src: "9879:44:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "9879:51:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "9879:51:3"
    							}
    						]
    					},
    					name: "cleanup_t_enum$_WorkflowStatus_$159",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "9834:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "cleaned",
    							nodeType: "YulTypedName",
    							src: "9844:7:3",
    							type: ""
    						}
    					],
    					src: "9789:147:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "10018:71:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "10028:55:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "10077:5:3"
    										}
    									],
    									functionName: {
    										name: "cleanup_t_enum$_WorkflowStatus_$159",
    										nodeType: "YulIdentifier",
    										src: "10041:35:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "10041:42:3"
    								},
    								variableNames: [
    									{
    										name: "converted",
    										nodeType: "YulIdentifier",
    										src: "10028:9:3"
    									}
    								]
    							}
    						]
    					},
    					name: "convert_t_enum$_WorkflowStatus_$159_to_t_uint8",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "9998:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "converted",
    							nodeType: "YulTypedName",
    							src: "10008:9:3",
    							type: ""
    						}
    					],
    					src: "9942:147:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "10176:82:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "10193:3:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "10245:5:3"
    												}
    											],
    											functionName: {
    												name: "convert_t_enum$_WorkflowStatus_$159_to_t_uint8",
    												nodeType: "YulIdentifier",
    												src: "10198:46:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "10198:53:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "10186:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "10186:66:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "10186:66:3"
    							}
    						]
    					},
    					name: "abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "10164:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "10171:3:3",
    							type: ""
    						}
    					],
    					src: "10095:163:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "10378:140:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "10388:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "10400:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "10411:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "10396:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "10396:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "10388:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "10484:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "10497:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "10508:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "10493:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "10493:17:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack",
    										nodeType: "YulIdentifier",
    										src: "10424:59:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "10424:87:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "10424:87:3"
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_enum$_WorkflowStatus_$159__to_t_uint8__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "10350:9:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "10362:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "10373:4:3",
    							type: ""
    						}
    					],
    					src: "10264:254:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "10620:73:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "10637:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "10642:6:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "10630:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "10630:19:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "10630:19:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "10658:29:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "10677:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "10682:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "10673:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "10673:14:3"
    								},
    								variableNames: [
    									{
    										name: "updated_pos",
    										nodeType: "YulIdentifier",
    										src: "10658:11:3"
    									}
    								]
    							}
    						]
    					},
    					name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "10592:3:3",
    							type: ""
    						},
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "10597:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "updated_pos",
    							nodeType: "YulTypedName",
    							src: "10608:11:3",
    							type: ""
    						}
    					],
    					src: "10524:169:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "10805:75:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "10827:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "10835:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "10823:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "10823:14:3"
    										},
    										{
    											hexValue: "596f7520617265206e6f74207265676973746572656420746f20766f74652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "10839:33:3",
    											type: "",
    											value: "You are not registered to vote."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "10816:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "10816:57:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "10816:57:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "10797:6:3",
    							type: ""
    						}
    					],
    					src: "10699:181:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "11032:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "11042:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "11108:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "11113:2:3",
    											type: "",
    											value: "31"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "11049:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11049:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "11042:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "11214:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473",
    										nodeType: "YulIdentifier",
    										src: "11125:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11125:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "11125:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "11227:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "11238:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "11243:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "11234:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11234:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "11227:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "11020:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "11028:3:3",
    							type: ""
    						}
    					],
    					src: "10886:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "11429:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "11439:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "11451:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "11462:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "11447:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11447:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "11439:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "11486:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "11497:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "11482:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "11482:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "11505:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "11511:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "11501:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "11501:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "11475:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11475:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "11475:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "11531:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "11665:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "11539:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11539:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "11531:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "11409:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "11424:4:3",
    							type: ""
    						}
    					],
    					src: "11258:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "11789:114:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "11811:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "11819:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "11807:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "11807:14:3"
    										},
    										{
    											hexValue: "54686520766f74696e672073657373696f6e206973206e6f7420616374697665",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "11823:34:3",
    											type: "",
    											value: "The voting session is not active"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "11800:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11800:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "11800:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "11879:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "11887:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "11875:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "11875:15:3"
    										},
    										{
    											hexValue: "2e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "11892:3:3",
    											type: "",
    											value: "."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "11868:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "11868:28:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "11868:28:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "11781:6:3",
    							type: ""
    						}
    					],
    					src: "11683:220:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "12055:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "12065:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "12131:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "12136:2:3",
    											type: "",
    											value: "33"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "12072:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "12072:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "12065:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "12237:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018",
    										nodeType: "YulIdentifier",
    										src: "12148:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "12148:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "12148:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "12250:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "12261:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "12266:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "12257:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "12257:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "12250:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "12043:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "12051:3:3",
    							type: ""
    						}
    					],
    					src: "11909:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "12452:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "12462:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "12474:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "12485:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "12470:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "12470:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "12462:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "12509:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "12520:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "12505:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "12505:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "12528:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "12534:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "12524:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "12524:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "12498:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "12498:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "12498:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "12554:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "12688:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "12562:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "12562:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "12554:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "12432:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "12447:4:3",
    							type: ""
    						}
    					],
    					src: "12281:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "12812:67:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "12834:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "12842:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "12830:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "12830:14:3"
    										},
    										{
    											hexValue: "596f75206861766520616c726561647920766f7465642e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "12846:25:3",
    											type: "",
    											value: "You have already voted."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "12823:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "12823:49:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "12823:49:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "12804:6:3",
    							type: ""
    						}
    					],
    					src: "12706:173:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "13031:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "13041:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "13107:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13112:2:3",
    											type: "",
    											value: "23"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "13048:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13048:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "13041:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "13213:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863",
    										nodeType: "YulIdentifier",
    										src: "13124:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13124:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "13124:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "13226:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "13237:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13242:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "13233:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13233:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "13226:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "13019:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "13027:3:3",
    							type: ""
    						}
    					],
    					src: "12885:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "13428:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "13438:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "13450:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13461:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "13446:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13446:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "13438:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "13485:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "13496:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "13481:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "13481:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "13504:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "13510:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "13500:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "13500:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "13474:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13474:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "13474:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "13530:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "13664:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "13538:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13538:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "13530:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "13408:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "13423:4:3",
    							type: ""
    						}
    					],
    					src: "13257:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "13710:152:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13727:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13730:77:3",
    											type: "",
    											value: "35408467139433450592217433187231851964531694900788300625387963629091585785856"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "13720:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13720:88:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "13720:88:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13824:1:3",
    											type: "",
    											value: "4"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13827:4:3",
    											type: "",
    											value: "0x32"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "13817:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13817:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "13817:15:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13848:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13851:4:3",
    											type: "",
    											value: "0x24"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "13841:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13841:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "13841:15:3"
    							}
    						]
    					},
    					name: "panic_error_0x32",
    					nodeType: "YulFunctionDefinition",
    					src: "13682:180:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "13896:152:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13913:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "13916:77:3",
    											type: "",
    											value: "35408467139433450592217433187231851964531694900788300625387963629091585785856"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "13906:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "13906:88:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "13906:88:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "14010:1:3",
    											type: "",
    											value: "4"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "14013:4:3",
    											type: "",
    											value: "0x11"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "14003:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14003:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "14003:15:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "14034:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "14037:4:3",
    											type: "",
    											value: "0x24"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "14027:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14027:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "14027:15:3"
    							}
    						]
    					},
    					name: "panic_error_0x11",
    					nodeType: "YulFunctionDefinition",
    					src: "13868:180:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "14097:190:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "14107:33:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "14134:5:3"
    										}
    									],
    									functionName: {
    										name: "cleanup_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "14116:17:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14116:24:3"
    								},
    								variableNames: [
    									{
    										name: "value",
    										nodeType: "YulIdentifier",
    										src: "14107:5:3"
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "14230:22:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x11",
    													nodeType: "YulIdentifier",
    													src: "14232:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "14232:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "14232:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "14155:5:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "14162:66:3",
    											type: "",
    											value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    										}
    									],
    									functionName: {
    										name: "eq",
    										nodeType: "YulIdentifier",
    										src: "14152:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14152:77:3"
    								},
    								nodeType: "YulIf",
    								src: "14149:103:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "14261:20:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "14272:5:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "14279:1:3",
    											type: "",
    											value: "1"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "14268:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14268:13:3"
    								},
    								variableNames: [
    									{
    										name: "ret",
    										nodeType: "YulIdentifier",
    										src: "14261:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "increment_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "14083:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "ret",
    							nodeType: "YulTypedName",
    							src: "14093:3:3",
    							type: ""
    						}
    					],
    					src: "14054:233:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "14419:206:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "14429:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "14441:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "14452:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "14437:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14437:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "14429:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "14509:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "14522:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "14533:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "14518:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "14518:17:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_address_to_t_address_fromStack",
    										nodeType: "YulIdentifier",
    										src: "14465:43:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14465:71:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "14465:71:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value1",
    											nodeType: "YulIdentifier",
    											src: "14590:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "14603:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "14614:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "14599:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "14599:18:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_uint256_to_t_uint256_fromStack",
    										nodeType: "YulIdentifier",
    										src: "14546:43:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14546:72:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "14546:72:3"
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_address_t_uint256__to_t_address_t_uint256__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "14383:9:3",
    							type: ""
    						},
    						{
    							name: "value1",
    							nodeType: "YulTypedName",
    							src: "14395:6:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "14403:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "14414:4:3",
    							type: ""
    						}
    					],
    					src: "14293:332:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "14737:118:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "14759:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "14767:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "14755:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "14755:14:3"
    										},
    										{
    											hexValue: "50726f706f73616c7320726567697374726174696f6e206973206e6f74206163",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "14771:34:3",
    											type: "",
    											value: "Proposals registration is not ac"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "14748:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14748:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "14748:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "14827:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "14835:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "14823:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "14823:15:3"
    										},
    										{
    											hexValue: "746976652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "14840:7:3",
    											type: "",
    											value: "tive."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "14816:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "14816:32:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "14816:32:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "14729:6:3",
    							type: ""
    						}
    					],
    					src: "14631:224:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "15007:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "15017:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "15083:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "15088:2:3",
    											type: "",
    											value: "37"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "15024:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "15024:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "15017:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "15189:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943",
    										nodeType: "YulIdentifier",
    										src: "15100:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "15100:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "15100:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "15202:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "15213:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "15218:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "15209:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "15209:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "15202:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "14995:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "15003:3:3",
    							type: ""
    						}
    					],
    					src: "14861:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "15404:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "15414:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "15426:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "15437:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "15422:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "15422:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "15414:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "15461:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "15472:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "15457:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "15457:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "15480:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "15486:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "15476:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "15476:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "15450:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "15450:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "15450:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "15506:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "15640:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "15514:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "15514:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "15506:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "15384:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "15399:4:3",
    							type: ""
    						}
    					],
    					src: "15233:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "15772:34:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "15782:18:3",
    								value: {
    									name: "pos",
    									nodeType: "YulIdentifier",
    									src: "15797:3:3"
    								},
    								variableNames: [
    									{
    										name: "updated_pos",
    										nodeType: "YulIdentifier",
    										src: "15782:11:3"
    									}
    								]
    							}
    						]
    					},
    					name: "array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "15744:3:3",
    							type: ""
    						},
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "15749:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "updated_pos",
    							nodeType: "YulTypedName",
    							src: "15760:11:3",
    							type: ""
    						}
    					],
    					src: "15658:148:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "15922:280:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "15932:53:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "15979:5:3"
    										}
    									],
    									functionName: {
    										name: "array_length_t_string_memory_ptr",
    										nodeType: "YulIdentifier",
    										src: "15946:32:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "15946:39:3"
    								},
    								variables: [
    									{
    										name: "length",
    										nodeType: "YulTypedName",
    										src: "15936:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "15994:96:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "16078:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "16083:6:3"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack",
    										nodeType: "YulIdentifier",
    										src: "16001:76:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "16001:89:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "15994:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "16138:5:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "16145:4:3",
    													type: "",
    													value: "0x20"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "16134:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "16134:16:3"
    										},
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "16152:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "16157:6:3"
    										}
    									],
    									functionName: {
    										name: "copy_memory_to_memory_with_cleanup",
    										nodeType: "YulIdentifier",
    										src: "16099:34:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "16099:65:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "16099:65:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "16173:23:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "16184:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "16189:6:3"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "16180:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "16180:16:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "16173:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_nonPadded_inplace_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "15903:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "15910:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "15918:3:3",
    							type: ""
    						}
    					],
    					src: "15812:390:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "16344:139:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "16355:102:3",
    								value: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "16444:6:3"
    										},
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "16453:3:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_nonPadded_inplace_fromStack",
    										nodeType: "YulIdentifier",
    										src: "16362:81:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "16362:95:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "16355:3:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "16467:10:3",
    								value: {
    									name: "pos",
    									nodeType: "YulIdentifier",
    									src: "16474:3:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "16467:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_packed_t_string_memory_ptr__to_t_string_memory_ptr__nonPadded_inplace_fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "16323:3:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "16329:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "16340:3:3",
    							type: ""
    						}
    					],
    					src: "16208:275:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "16595:66:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "16617:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "16625:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "16613:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "16613:14:3"
    										},
    										{
    											hexValue: "50726f706f73616c2063616e2774206265206e756c6c",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "16629:24:3",
    											type: "",
    											value: "Proposal can't be null"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "16606:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "16606:48:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "16606:48:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "16587:6:3",
    							type: ""
    						}
    					],
    					src: "16489:172:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "16813:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "16823:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "16889:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "16894:2:3",
    											type: "",
    											value: "22"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "16830:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "16830:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "16823:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "16995:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5",
    										nodeType: "YulIdentifier",
    										src: "16906:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "16906:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "16906:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "17008:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "17019:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17024:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "17015:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17015:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "17008:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "16801:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "16809:3:3",
    							type: ""
    						}
    					],
    					src: "16667:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "17210:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "17220:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "17232:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17243:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "17228:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17228:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "17220:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "17267:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "17278:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "17263:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "17263:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "17286:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "17292:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "17282:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "17282:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "17256:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17256:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "17256:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "17312:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "17446:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "17320:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17320:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "17312:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "17190:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "17205:4:3",
    							type: ""
    						}
    					],
    					src: "17039:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "17492:152:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17509:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17512:77:3",
    											type: "",
    											value: "35408467139433450592217433187231851964531694900788300625387963629091585785856"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "17502:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17502:88:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "17502:88:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17606:1:3",
    											type: "",
    											value: "4"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17609:4:3",
    											type: "",
    											value: "0x22"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "17599:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17599:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "17599:15:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17630:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17633:4:3",
    											type: "",
    											value: "0x24"
    										}
    									],
    									functionName: {
    										name: "revert",
    										nodeType: "YulIdentifier",
    										src: "17623:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17623:15:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "17623:15:3"
    							}
    						]
    					},
    					name: "panic_error_0x22",
    					nodeType: "YulFunctionDefinition",
    					src: "17464:180:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "17701:269:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "17711:22:3",
    								value: {
    									"arguments": [
    										{
    											name: "data",
    											nodeType: "YulIdentifier",
    											src: "17725:4:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17731:1:3",
    											type: "",
    											value: "2"
    										}
    									],
    									functionName: {
    										name: "div",
    										nodeType: "YulIdentifier",
    										src: "17721:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17721:12:3"
    								},
    								variableNames: [
    									{
    										name: "length",
    										nodeType: "YulIdentifier",
    										src: "17711:6:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "17742:38:3",
    								value: {
    									"arguments": [
    										{
    											name: "data",
    											nodeType: "YulIdentifier",
    											src: "17772:4:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "17778:1:3",
    											type: "",
    											value: "1"
    										}
    									],
    									functionName: {
    										name: "and",
    										nodeType: "YulIdentifier",
    										src: "17768:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17768:12:3"
    								},
    								variables: [
    									{
    										name: "outOfPlaceEncoding",
    										nodeType: "YulTypedName",
    										src: "17746:18:3",
    										type: ""
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "17819:51:3",
    									statements: [
    										{
    											nodeType: "YulAssignment",
    											src: "17833:27:3",
    											value: {
    												"arguments": [
    													{
    														name: "length",
    														nodeType: "YulIdentifier",
    														src: "17847:6:3"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "17855:4:3",
    														type: "",
    														value: "0x7f"
    													}
    												],
    												functionName: {
    													name: "and",
    													nodeType: "YulIdentifier",
    													src: "17843:3:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "17843:17:3"
    											},
    											variableNames: [
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "17833:6:3"
    												}
    											]
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "outOfPlaceEncoding",
    											nodeType: "YulIdentifier",
    											src: "17799:18:3"
    										}
    									],
    									functionName: {
    										name: "iszero",
    										nodeType: "YulIdentifier",
    										src: "17792:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17792:26:3"
    								},
    								nodeType: "YulIf",
    								src: "17789:81:3"
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "17922:42:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x22",
    													nodeType: "YulIdentifier",
    													src: "17936:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "17936:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "17936:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "outOfPlaceEncoding",
    											nodeType: "YulIdentifier",
    											src: "17886:18:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "length",
    													nodeType: "YulIdentifier",
    													src: "17909:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "17917:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "lt",
    												nodeType: "YulIdentifier",
    												src: "17906:2:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "17906:14:3"
    										}
    									],
    									functionName: {
    										name: "eq",
    										nodeType: "YulIdentifier",
    										src: "17883:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "17883:38:3"
    								},
    								nodeType: "YulIf",
    								src: "17880:84:3"
    							}
    						]
    					},
    					name: "extract_byte_array_length",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "data",
    							nodeType: "YulTypedName",
    							src: "17685:4:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "length",
    							nodeType: "YulTypedName",
    							src: "17694:6:3",
    							type: ""
    						}
    					],
    					src: "17650:320:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "18030:87:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "18040:11:3",
    								value: {
    									name: "ptr",
    									nodeType: "YulIdentifier",
    									src: "18048:3:3"
    								},
    								variableNames: [
    									{
    										name: "data",
    										nodeType: "YulIdentifier",
    										src: "18040:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "18068:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											name: "ptr",
    											nodeType: "YulIdentifier",
    											src: "18071:3:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "18061:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "18061:14:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "18061:14:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "18084:26:3",
    								value: {
    									"arguments": [
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "18102:1:3",
    											type: "",
    											value: "0"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "18105:4:3",
    											type: "",
    											value: "0x20"
    										}
    									],
    									functionName: {
    										name: "keccak256",
    										nodeType: "YulIdentifier",
    										src: "18092:9:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "18092:18:3"
    								},
    								variableNames: [
    									{
    										name: "data",
    										nodeType: "YulIdentifier",
    										src: "18084:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "array_dataslot_t_string_storage",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "ptr",
    							nodeType: "YulTypedName",
    							src: "18017:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "data",
    							nodeType: "YulTypedName",
    							src: "18025:4:3",
    							type: ""
    						}
    					],
    					src: "17976:141:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "18254:767:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "18264:29:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "18287:5:3"
    										}
    									],
    									functionName: {
    										name: "sload",
    										nodeType: "YulIdentifier",
    										src: "18281:5:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "18281:12:3"
    								},
    								variables: [
    									{
    										name: "slotValue",
    										nodeType: "YulTypedName",
    										src: "18268:9:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "18302:50:3",
    								value: {
    									"arguments": [
    										{
    											name: "slotValue",
    											nodeType: "YulIdentifier",
    											src: "18342:9:3"
    										}
    									],
    									functionName: {
    										name: "extract_byte_array_length",
    										nodeType: "YulIdentifier",
    										src: "18316:25:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "18316:36:3"
    								},
    								variables: [
    									{
    										name: "length",
    										nodeType: "YulTypedName",
    										src: "18306:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "18361:96:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "18445:3:3"
    										},
    										{
    											name: "length",
    											nodeType: "YulIdentifier",
    											src: "18450:6:3"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack",
    										nodeType: "YulIdentifier",
    										src: "18368:76:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "18368:89:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "18361:3:3"
    									}
    								]
    							},
    							{
    								cases: [
    									{
    										body: {
    											nodeType: "YulBlock",
    											src: "18506:159:3",
    											statements: [
    												{
    													expression: {
    														"arguments": [
    															{
    																name: "pos",
    																nodeType: "YulIdentifier",
    																src: "18559:3:3"
    															},
    															{
    																"arguments": [
    																	{
    																		name: "slotValue",
    																		nodeType: "YulIdentifier",
    																		src: "18568:9:3"
    																	},
    																	{
    																		"arguments": [
    																			{
    																				kind: "number",
    																				nodeType: "YulLiteral",
    																				src: "18583:4:3",
    																				type: "",
    																				value: "0xff"
    																			}
    																		],
    																		functionName: {
    																			name: "not",
    																			nodeType: "YulIdentifier",
    																			src: "18579:3:3"
    																		},
    																		nodeType: "YulFunctionCall",
    																		src: "18579:9:3"
    																	}
    																],
    																functionName: {
    																	name: "and",
    																	nodeType: "YulIdentifier",
    																	src: "18564:3:3"
    																},
    																nodeType: "YulFunctionCall",
    																src: "18564:25:3"
    															}
    														],
    														functionName: {
    															name: "mstore",
    															nodeType: "YulIdentifier",
    															src: "18552:6:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "18552:38:3"
    													},
    													nodeType: "YulExpressionStatement",
    													src: "18552:38:3"
    												},
    												{
    													nodeType: "YulAssignment",
    													src: "18603:52:3",
    													value: {
    														"arguments": [
    															{
    																name: "pos",
    																nodeType: "YulIdentifier",
    																src: "18614:3:3"
    															},
    															{
    																"arguments": [
    																	{
    																		name: "length",
    																		nodeType: "YulIdentifier",
    																		src: "18623:6:3"
    																	},
    																	{
    																		"arguments": [
    																			{
    																				"arguments": [
    																					{
    																						name: "length",
    																						nodeType: "YulIdentifier",
    																						src: "18645:6:3"
    																					}
    																				],
    																				functionName: {
    																					name: "iszero",
    																					nodeType: "YulIdentifier",
    																					src: "18638:6:3"
    																				},
    																				nodeType: "YulFunctionCall",
    																				src: "18638:14:3"
    																			}
    																		],
    																		functionName: {
    																			name: "iszero",
    																			nodeType: "YulIdentifier",
    																			src: "18631:6:3"
    																		},
    																		nodeType: "YulFunctionCall",
    																		src: "18631:22:3"
    																	}
    																],
    																functionName: {
    																	name: "mul",
    																	nodeType: "YulIdentifier",
    																	src: "18619:3:3"
    																},
    																nodeType: "YulFunctionCall",
    																src: "18619:35:3"
    															}
    														],
    														functionName: {
    															name: "add",
    															nodeType: "YulIdentifier",
    															src: "18610:3:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "18610:45:3"
    													},
    													variableNames: [
    														{
    															name: "ret",
    															nodeType: "YulIdentifier",
    															src: "18603:3:3"
    														}
    													]
    												}
    											]
    										},
    										nodeType: "YulCase",
    										src: "18499:166:3",
    										value: {
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "18504:1:3",
    											type: "",
    											value: "0"
    										}
    									},
    									{
    										body: {
    											nodeType: "YulBlock",
    											src: "18681:334:3",
    											statements: [
    												{
    													nodeType: "YulVariableDeclaration",
    													src: "18726:53:3",
    													value: {
    														"arguments": [
    															{
    																name: "value",
    																nodeType: "YulIdentifier",
    																src: "18773:5:3"
    															}
    														],
    														functionName: {
    															name: "array_dataslot_t_string_storage",
    															nodeType: "YulIdentifier",
    															src: "18741:31:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "18741:38:3"
    													},
    													variables: [
    														{
    															name: "dataPos",
    															nodeType: "YulTypedName",
    															src: "18730:7:3",
    															type: ""
    														}
    													]
    												},
    												{
    													nodeType: "YulVariableDeclaration",
    													src: "18792:10:3",
    													value: {
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "18801:1:3",
    														type: "",
    														value: "0"
    													},
    													variables: [
    														{
    															name: "i",
    															nodeType: "YulTypedName",
    															src: "18796:1:3",
    															type: ""
    														}
    													]
    												},
    												{
    													body: {
    														nodeType: "YulBlock",
    														src: "18859:110:3",
    														statements: [
    															{
    																expression: {
    																	"arguments": [
    																		{
    																			"arguments": [
    																				{
    																					name: "pos",
    																					nodeType: "YulIdentifier",
    																					src: "18888:3:3"
    																				},
    																				{
    																					name: "i",
    																					nodeType: "YulIdentifier",
    																					src: "18893:1:3"
    																				}
    																			],
    																			functionName: {
    																				name: "add",
    																				nodeType: "YulIdentifier",
    																				src: "18884:3:3"
    																			},
    																			nodeType: "YulFunctionCall",
    																			src: "18884:11:3"
    																		},
    																		{
    																			"arguments": [
    																				{
    																					name: "dataPos",
    																					nodeType: "YulIdentifier",
    																					src: "18903:7:3"
    																				}
    																			],
    																			functionName: {
    																				name: "sload",
    																				nodeType: "YulIdentifier",
    																				src: "18897:5:3"
    																			},
    																			nodeType: "YulFunctionCall",
    																			src: "18897:14:3"
    																		}
    																	],
    																	functionName: {
    																		name: "mstore",
    																		nodeType: "YulIdentifier",
    																		src: "18877:6:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "18877:35:3"
    																},
    																nodeType: "YulExpressionStatement",
    																src: "18877:35:3"
    															},
    															{
    																nodeType: "YulAssignment",
    																src: "18929:26:3",
    																value: {
    																	"arguments": [
    																		{
    																			name: "dataPos",
    																			nodeType: "YulIdentifier",
    																			src: "18944:7:3"
    																		},
    																		{
    																			kind: "number",
    																			nodeType: "YulLiteral",
    																			src: "18953:1:3",
    																			type: "",
    																			value: "1"
    																		}
    																	],
    																	functionName: {
    																		name: "add",
    																		nodeType: "YulIdentifier",
    																		src: "18940:3:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "18940:15:3"
    																},
    																variableNames: [
    																	{
    																		name: "dataPos",
    																		nodeType: "YulIdentifier",
    																		src: "18929:7:3"
    																	}
    																]
    															}
    														]
    													},
    													condition: {
    														"arguments": [
    															{
    																name: "i",
    																nodeType: "YulIdentifier",
    																src: "18826:1:3"
    															},
    															{
    																name: "length",
    																nodeType: "YulIdentifier",
    																src: "18829:6:3"
    															}
    														],
    														functionName: {
    															name: "lt",
    															nodeType: "YulIdentifier",
    															src: "18823:2:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "18823:13:3"
    													},
    													nodeType: "YulForLoop",
    													post: {
    														nodeType: "YulBlock",
    														src: "18837:21:3",
    														statements: [
    															{
    																nodeType: "YulAssignment",
    																src: "18839:17:3",
    																value: {
    																	"arguments": [
    																		{
    																			name: "i",
    																			nodeType: "YulIdentifier",
    																			src: "18848:1:3"
    																		},
    																		{
    																			kind: "number",
    																			nodeType: "YulLiteral",
    																			src: "18851:4:3",
    																			type: "",
    																			value: "0x20"
    																		}
    																	],
    																	functionName: {
    																		name: "add",
    																		nodeType: "YulIdentifier",
    																		src: "18844:3:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "18844:12:3"
    																},
    																variableNames: [
    																	{
    																		name: "i",
    																		nodeType: "YulIdentifier",
    																		src: "18839:1:3"
    																	}
    																]
    															}
    														]
    													},
    													pre: {
    														nodeType: "YulBlock",
    														src: "18819:3:3",
    														statements: [
    														]
    													},
    													src: "18815:154:3"
    												},
    												{
    													nodeType: "YulAssignment",
    													src: "18982:23:3",
    													value: {
    														"arguments": [
    															{
    																name: "pos",
    																nodeType: "YulIdentifier",
    																src: "18993:3:3"
    															},
    															{
    																name: "length",
    																nodeType: "YulIdentifier",
    																src: "18998:6:3"
    															}
    														],
    														functionName: {
    															name: "add",
    															nodeType: "YulIdentifier",
    															src: "18989:3:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "18989:16:3"
    													},
    													variableNames: [
    														{
    															name: "ret",
    															nodeType: "YulIdentifier",
    															src: "18982:3:3"
    														}
    													]
    												}
    											]
    										},
    										nodeType: "YulCase",
    										src: "18674:341:3",
    										value: {
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "18679:1:3",
    											type: "",
    											value: "1"
    										}
    									}
    								],
    								expression: {
    									"arguments": [
    										{
    											name: "slotValue",
    											nodeType: "YulIdentifier",
    											src: "18477:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "18488:1:3",
    											type: "",
    											value: "1"
    										}
    									],
    									functionName: {
    										name: "and",
    										nodeType: "YulIdentifier",
    										src: "18473:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "18473:17:3"
    								},
    								nodeType: "YulSwitch",
    								src: "18466:549:3"
    							}
    						]
    					},
    					name: "abi_encode_t_string_storage_to_t_string_memory_ptr_nonPadded_inplace_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "18235:5:3",
    							type: ""
    						},
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "18242:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "ret",
    							nodeType: "YulTypedName",
    							src: "18250:3:3",
    							type: ""
    						}
    					],
    					src: "18147:874:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "19160:136:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "19171:99:3",
    								value: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "19257:6:3"
    										},
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "19266:3:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_string_storage_to_t_string_memory_ptr_nonPadded_inplace_fromStack",
    										nodeType: "YulIdentifier",
    										src: "19178:78:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "19178:92:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "19171:3:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "19280:10:3",
    								value: {
    									name: "pos",
    									nodeType: "YulIdentifier",
    									src: "19287:3:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "19280:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_packed_t_string_storage__to_t_string_memory_ptr__nonPadded_inplace_fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "19139:3:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "19145:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "19156:3:3",
    							type: ""
    						}
    					],
    					src: "19027:269:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "19408:72:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "19430:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "19438:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "19426:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "19426:14:3"
    										},
    										{
    											hexValue: "50726f706f73616c20616c726561647920726567697374657265642e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "19442:30:3",
    											type: "",
    											value: "Proposal already registered."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "19419:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "19419:54:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "19419:54:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "19400:6:3",
    							type: ""
    						}
    					],
    					src: "19302:178:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "19632:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "19642:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "19708:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "19713:2:3",
    											type: "",
    											value: "28"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "19649:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "19649:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "19642:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "19814:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b",
    										nodeType: "YulIdentifier",
    										src: "19725:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "19725:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "19725:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "19827:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "19838:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "19843:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "19834:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "19834:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "19827:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "19620:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "19628:3:3",
    							type: ""
    						}
    					],
    					src: "19486:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "20029:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "20039:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "20051:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "20062:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "20047:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20047:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "20039:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "20086:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "20097:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "20082:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "20082:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "20105:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "20111:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "20101:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "20101:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "20075:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20075:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "20075:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "20131:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "20265:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "20139:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20139:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "20131:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "20009:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "20024:4:3",
    							type: ""
    						}
    					],
    					src: "19858:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "20327:49:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "20337:33:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "value",
    													nodeType: "YulIdentifier",
    													src: "20355:5:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "20362:2:3",
    													type: "",
    													value: "31"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "20351:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "20351:14:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "20367:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "div",
    										nodeType: "YulIdentifier",
    										src: "20347:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20347:23:3"
    								},
    								variableNames: [
    									{
    										name: "result",
    										nodeType: "YulIdentifier",
    										src: "20337:6:3"
    									}
    								]
    							}
    						]
    					},
    					name: "divide_by_32_ceil",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "20310:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "result",
    							nodeType: "YulTypedName",
    							src: "20320:6:3",
    							type: ""
    						}
    					],
    					src: "20283:93:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "20435:54:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "20445:37:3",
    								value: {
    									"arguments": [
    										{
    											name: "bits",
    											nodeType: "YulIdentifier",
    											src: "20470:4:3"
    										},
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "20476:5:3"
    										}
    									],
    									functionName: {
    										name: "shl",
    										nodeType: "YulIdentifier",
    										src: "20466:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20466:16:3"
    								},
    								variableNames: [
    									{
    										name: "newValue",
    										nodeType: "YulIdentifier",
    										src: "20445:8:3"
    									}
    								]
    							}
    						]
    					},
    					name: "shift_left_dynamic",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "bits",
    							nodeType: "YulTypedName",
    							src: "20410:4:3",
    							type: ""
    						},
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "20416:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "newValue",
    							nodeType: "YulTypedName",
    							src: "20426:8:3",
    							type: ""
    						}
    					],
    					src: "20382:107:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "20571:317:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "20581:35:3",
    								value: {
    									"arguments": [
    										{
    											name: "shiftBytes",
    											nodeType: "YulIdentifier",
    											src: "20602:10:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "20614:1:3",
    											type: "",
    											value: "8"
    										}
    									],
    									functionName: {
    										name: "mul",
    										nodeType: "YulIdentifier",
    										src: "20598:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20598:18:3"
    								},
    								variables: [
    									{
    										name: "shiftBits",
    										nodeType: "YulTypedName",
    										src: "20585:9:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "20625:109:3",
    								value: {
    									"arguments": [
    										{
    											name: "shiftBits",
    											nodeType: "YulIdentifier",
    											src: "20656:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "20667:66:3",
    											type: "",
    											value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    										}
    									],
    									functionName: {
    										name: "shift_left_dynamic",
    										nodeType: "YulIdentifier",
    										src: "20637:18:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20637:97:3"
    								},
    								variables: [
    									{
    										name: "mask",
    										nodeType: "YulTypedName",
    										src: "20629:4:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "20743:51:3",
    								value: {
    									"arguments": [
    										{
    											name: "shiftBits",
    											nodeType: "YulIdentifier",
    											src: "20774:9:3"
    										},
    										{
    											name: "toInsert",
    											nodeType: "YulIdentifier",
    											src: "20785:8:3"
    										}
    									],
    									functionName: {
    										name: "shift_left_dynamic",
    										nodeType: "YulIdentifier",
    										src: "20755:18:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20755:39:3"
    								},
    								variableNames: [
    									{
    										name: "toInsert",
    										nodeType: "YulIdentifier",
    										src: "20743:8:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "20803:30:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "20816:5:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "mask",
    													nodeType: "YulIdentifier",
    													src: "20827:4:3"
    												}
    											],
    											functionName: {
    												name: "not",
    												nodeType: "YulIdentifier",
    												src: "20823:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "20823:9:3"
    										}
    									],
    									functionName: {
    										name: "and",
    										nodeType: "YulIdentifier",
    										src: "20812:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20812:21:3"
    								},
    								variableNames: [
    									{
    										name: "value",
    										nodeType: "YulIdentifier",
    										src: "20803:5:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "20842:40:3",
    								value: {
    									"arguments": [
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "20855:5:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "toInsert",
    													nodeType: "YulIdentifier",
    													src: "20866:8:3"
    												},
    												{
    													name: "mask",
    													nodeType: "YulIdentifier",
    													src: "20876:4:3"
    												}
    											],
    											functionName: {
    												name: "and",
    												nodeType: "YulIdentifier",
    												src: "20862:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "20862:19:3"
    										}
    									],
    									functionName: {
    										name: "or",
    										nodeType: "YulIdentifier",
    										src: "20852:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "20852:30:3"
    								},
    								variableNames: [
    									{
    										name: "result",
    										nodeType: "YulIdentifier",
    										src: "20842:6:3"
    									}
    								]
    							}
    						]
    					},
    					name: "update_byte_slice_dynamic32",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "20532:5:3",
    							type: ""
    						},
    						{
    							name: "shiftBytes",
    							nodeType: "YulTypedName",
    							src: "20539:10:3",
    							type: ""
    						},
    						{
    							name: "toInsert",
    							nodeType: "YulTypedName",
    							src: "20551:8:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "result",
    							nodeType: "YulTypedName",
    							src: "20564:6:3",
    							type: ""
    						}
    					],
    					src: "20495:393:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "20926:28:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "20936:12:3",
    								value: {
    									name: "value",
    									nodeType: "YulIdentifier",
    									src: "20943:5:3"
    								},
    								variableNames: [
    									{
    										name: "ret",
    										nodeType: "YulIdentifier",
    										src: "20936:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "identity",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "20912:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "ret",
    							nodeType: "YulTypedName",
    							src: "20922:3:3",
    							type: ""
    						}
    					],
    					src: "20894:60:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "21020:82:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "21030:66:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "value",
    															nodeType: "YulIdentifier",
    															src: "21088:5:3"
    														}
    													],
    													functionName: {
    														name: "cleanup_t_uint256",
    														nodeType: "YulIdentifier",
    														src: "21070:17:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "21070:24:3"
    												}
    											],
    											functionName: {
    												name: "identity",
    												nodeType: "YulIdentifier",
    												src: "21061:8:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "21061:34:3"
    										}
    									],
    									functionName: {
    										name: "cleanup_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "21043:17:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "21043:53:3"
    								},
    								variableNames: [
    									{
    										name: "converted",
    										nodeType: "YulIdentifier",
    										src: "21030:9:3"
    									}
    								]
    							}
    						]
    					},
    					name: "convert_t_uint256_to_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "21000:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "converted",
    							nodeType: "YulTypedName",
    							src: "21010:9:3",
    							type: ""
    						}
    					],
    					src: "20960:142:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "21155:28:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "21165:12:3",
    								value: {
    									name: "value",
    									nodeType: "YulIdentifier",
    									src: "21172:5:3"
    								},
    								variableNames: [
    									{
    										name: "ret",
    										nodeType: "YulIdentifier",
    										src: "21165:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "prepare_store_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "21141:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "ret",
    							nodeType: "YulTypedName",
    							src: "21151:3:3",
    							type: ""
    						}
    					],
    					src: "21108:75:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "21265:193:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "21275:63:3",
    								value: {
    									"arguments": [
    										{
    											name: "value_0",
    											nodeType: "YulIdentifier",
    											src: "21330:7:3"
    										}
    									],
    									functionName: {
    										name: "convert_t_uint256_to_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "21299:30:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "21299:39:3"
    								},
    								variables: [
    									{
    										name: "convertedValue_0",
    										nodeType: "YulTypedName",
    										src: "21279:16:3",
    										type: ""
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "slot",
    											nodeType: "YulIdentifier",
    											src: "21354:4:3"
    										},
    										{
    											"arguments": [
    												{
    													"arguments": [
    														{
    															name: "slot",
    															nodeType: "YulIdentifier",
    															src: "21394:4:3"
    														}
    													],
    													functionName: {
    														name: "sload",
    														nodeType: "YulIdentifier",
    														src: "21388:5:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "21388:11:3"
    												},
    												{
    													name: "offset",
    													nodeType: "YulIdentifier",
    													src: "21401:6:3"
    												},
    												{
    													"arguments": [
    														{
    															name: "convertedValue_0",
    															nodeType: "YulIdentifier",
    															src: "21433:16:3"
    														}
    													],
    													functionName: {
    														name: "prepare_store_t_uint256",
    														nodeType: "YulIdentifier",
    														src: "21409:23:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "21409:41:3"
    												}
    											],
    											functionName: {
    												name: "update_byte_slice_dynamic32",
    												nodeType: "YulIdentifier",
    												src: "21360:27:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "21360:91:3"
    										}
    									],
    									functionName: {
    										name: "sstore",
    										nodeType: "YulIdentifier",
    										src: "21347:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "21347:105:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "21347:105:3"
    							}
    						]
    					},
    					name: "update_storage_value_t_uint256_to_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "slot",
    							nodeType: "YulTypedName",
    							src: "21242:4:3",
    							type: ""
    						},
    						{
    							name: "offset",
    							nodeType: "YulTypedName",
    							src: "21248:6:3",
    							type: ""
    						},
    						{
    							name: "value_0",
    							nodeType: "YulTypedName",
    							src: "21256:7:3",
    							type: ""
    						}
    					],
    					src: "21189:269:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "21513:24:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "21523:8:3",
    								value: {
    									kind: "number",
    									nodeType: "YulLiteral",
    									src: "21530:1:3",
    									type: "",
    									value: "0"
    								},
    								variableNames: [
    									{
    										name: "ret",
    										nodeType: "YulIdentifier",
    										src: "21523:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "zero_value_for_split_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					returnVariables: [
    						{
    							name: "ret",
    							nodeType: "YulTypedName",
    							src: "21509:3:3",
    							type: ""
    						}
    					],
    					src: "21464:73:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "21596:136:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "21606:46:3",
    								value: {
    									"arguments": [
    									],
    									functionName: {
    										name: "zero_value_for_split_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "21620:30:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "21620:32:3"
    								},
    								variables: [
    									{
    										name: "zero_0",
    										nodeType: "YulTypedName",
    										src: "21610:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "slot",
    											nodeType: "YulIdentifier",
    											src: "21705:4:3"
    										},
    										{
    											name: "offset",
    											nodeType: "YulIdentifier",
    											src: "21711:6:3"
    										},
    										{
    											name: "zero_0",
    											nodeType: "YulIdentifier",
    											src: "21719:6:3"
    										}
    									],
    									functionName: {
    										name: "update_storage_value_t_uint256_to_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "21661:43:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "21661:65:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "21661:65:3"
    							}
    						]
    					},
    					name: "storage_set_to_zero_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "slot",
    							nodeType: "YulTypedName",
    							src: "21582:4:3",
    							type: ""
    						},
    						{
    							name: "offset",
    							nodeType: "YulTypedName",
    							src: "21588:6:3",
    							type: ""
    						}
    					],
    					src: "21543:189:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "21788:136:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "21855:63:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    													{
    														name: "start",
    														nodeType: "YulIdentifier",
    														src: "21899:5:3"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "21906:1:3",
    														type: "",
    														value: "0"
    													}
    												],
    												functionName: {
    													name: "storage_set_to_zero_t_uint256",
    													nodeType: "YulIdentifier",
    													src: "21869:29:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "21869:39:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "21869:39:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "start",
    											nodeType: "YulIdentifier",
    											src: "21808:5:3"
    										},
    										{
    											name: "end",
    											nodeType: "YulIdentifier",
    											src: "21815:3:3"
    										}
    									],
    									functionName: {
    										name: "lt",
    										nodeType: "YulIdentifier",
    										src: "21805:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "21805:14:3"
    								},
    								nodeType: "YulForLoop",
    								post: {
    									nodeType: "YulBlock",
    									src: "21820:26:3",
    									statements: [
    										{
    											nodeType: "YulAssignment",
    											src: "21822:22:3",
    											value: {
    												"arguments": [
    													{
    														name: "start",
    														nodeType: "YulIdentifier",
    														src: "21835:5:3"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "21842:1:3",
    														type: "",
    														value: "1"
    													}
    												],
    												functionName: {
    													name: "add",
    													nodeType: "YulIdentifier",
    													src: "21831:3:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "21831:13:3"
    											},
    											variableNames: [
    												{
    													name: "start",
    													nodeType: "YulIdentifier",
    													src: "21822:5:3"
    												}
    											]
    										}
    									]
    								},
    								pre: {
    									nodeType: "YulBlock",
    									src: "21802:2:3",
    									statements: [
    									]
    								},
    								src: "21798:120:3"
    							}
    						]
    					},
    					name: "clear_storage_range_t_bytes1",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "start",
    							nodeType: "YulTypedName",
    							src: "21776:5:3",
    							type: ""
    						},
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "21783:3:3",
    							type: ""
    						}
    					],
    					src: "21738:186:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "22009:464:3",
    						statements: [
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "22035:431:3",
    									statements: [
    										{
    											nodeType: "YulVariableDeclaration",
    											src: "22049:54:3",
    											value: {
    												"arguments": [
    													{
    														name: "array",
    														nodeType: "YulIdentifier",
    														src: "22097:5:3"
    													}
    												],
    												functionName: {
    													name: "array_dataslot_t_string_storage",
    													nodeType: "YulIdentifier",
    													src: "22065:31:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "22065:38:3"
    											},
    											variables: [
    												{
    													name: "dataArea",
    													nodeType: "YulTypedName",
    													src: "22053:8:3",
    													type: ""
    												}
    											]
    										},
    										{
    											nodeType: "YulVariableDeclaration",
    											src: "22116:63:3",
    											value: {
    												"arguments": [
    													{
    														name: "dataArea",
    														nodeType: "YulIdentifier",
    														src: "22139:8:3"
    													},
    													{
    														"arguments": [
    															{
    																name: "startIndex",
    																nodeType: "YulIdentifier",
    																src: "22167:10:3"
    															}
    														],
    														functionName: {
    															name: "divide_by_32_ceil",
    															nodeType: "YulIdentifier",
    															src: "22149:17:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "22149:29:3"
    													}
    												],
    												functionName: {
    													name: "add",
    													nodeType: "YulIdentifier",
    													src: "22135:3:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "22135:44:3"
    											},
    											variables: [
    												{
    													name: "deleteStart",
    													nodeType: "YulTypedName",
    													src: "22120:11:3",
    													type: ""
    												}
    											]
    										},
    										{
    											body: {
    												nodeType: "YulBlock",
    												src: "22336:27:3",
    												statements: [
    													{
    														nodeType: "YulAssignment",
    														src: "22338:23:3",
    														value: {
    															name: "dataArea",
    															nodeType: "YulIdentifier",
    															src: "22353:8:3"
    														},
    														variableNames: [
    															{
    																name: "deleteStart",
    																nodeType: "YulIdentifier",
    																src: "22338:11:3"
    															}
    														]
    													}
    												]
    											},
    											condition: {
    												"arguments": [
    													{
    														name: "startIndex",
    														nodeType: "YulIdentifier",
    														src: "22320:10:3"
    													},
    													{
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "22332:2:3",
    														type: "",
    														value: "32"
    													}
    												],
    												functionName: {
    													name: "lt",
    													nodeType: "YulIdentifier",
    													src: "22317:2:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "22317:18:3"
    											},
    											nodeType: "YulIf",
    											src: "22314:49:3"
    										},
    										{
    											expression: {
    												"arguments": [
    													{
    														name: "deleteStart",
    														nodeType: "YulIdentifier",
    														src: "22405:11:3"
    													},
    													{
    														"arguments": [
    															{
    																name: "dataArea",
    																nodeType: "YulIdentifier",
    																src: "22422:8:3"
    															},
    															{
    																"arguments": [
    																	{
    																		name: "len",
    																		nodeType: "YulIdentifier",
    																		src: "22450:3:3"
    																	}
    																],
    																functionName: {
    																	name: "divide_by_32_ceil",
    																	nodeType: "YulIdentifier",
    																	src: "22432:17:3"
    																},
    																nodeType: "YulFunctionCall",
    																src: "22432:22:3"
    															}
    														],
    														functionName: {
    															name: "add",
    															nodeType: "YulIdentifier",
    															src: "22418:3:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "22418:37:3"
    													}
    												],
    												functionName: {
    													name: "clear_storage_range_t_bytes1",
    													nodeType: "YulIdentifier",
    													src: "22376:28:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "22376:80:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "22376:80:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "len",
    											nodeType: "YulIdentifier",
    											src: "22026:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "22031:2:3",
    											type: "",
    											value: "31"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "22023:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "22023:11:3"
    								},
    								nodeType: "YulIf",
    								src: "22020:446:3"
    							}
    						]
    					},
    					name: "clean_up_bytearray_end_slots_t_string_storage",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "array",
    							nodeType: "YulTypedName",
    							src: "21985:5:3",
    							type: ""
    						},
    						{
    							name: "len",
    							nodeType: "YulTypedName",
    							src: "21992:3:3",
    							type: ""
    						},
    						{
    							name: "startIndex",
    							nodeType: "YulTypedName",
    							src: "21997:10:3",
    							type: ""
    						}
    					],
    					src: "21930:543:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "22542:54:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "22552:37:3",
    								value: {
    									"arguments": [
    										{
    											name: "bits",
    											nodeType: "YulIdentifier",
    											src: "22577:4:3"
    										},
    										{
    											name: "value",
    											nodeType: "YulIdentifier",
    											src: "22583:5:3"
    										}
    									],
    									functionName: {
    										name: "shr",
    										nodeType: "YulIdentifier",
    										src: "22573:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "22573:16:3"
    								},
    								variableNames: [
    									{
    										name: "newValue",
    										nodeType: "YulIdentifier",
    										src: "22552:8:3"
    									}
    								]
    							}
    						]
    					},
    					name: "shift_right_unsigned_dynamic",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "bits",
    							nodeType: "YulTypedName",
    							src: "22517:4:3",
    							type: ""
    						},
    						{
    							name: "value",
    							nodeType: "YulTypedName",
    							src: "22523:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "newValue",
    							nodeType: "YulTypedName",
    							src: "22533:8:3",
    							type: ""
    						}
    					],
    					src: "22479:117:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "22653:118:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "22663:68:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													"arguments": [
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "22712:1:3",
    															type: "",
    															value: "8"
    														},
    														{
    															name: "bytes",
    															nodeType: "YulIdentifier",
    															src: "22715:5:3"
    														}
    													],
    													functionName: {
    														name: "mul",
    														nodeType: "YulIdentifier",
    														src: "22708:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "22708:13:3"
    												},
    												{
    													"arguments": [
    														{
    															kind: "number",
    															nodeType: "YulLiteral",
    															src: "22727:1:3",
    															type: "",
    															value: "0"
    														}
    													],
    													functionName: {
    														name: "not",
    														nodeType: "YulIdentifier",
    														src: "22723:3:3"
    													},
    													nodeType: "YulFunctionCall",
    													src: "22723:6:3"
    												}
    											],
    											functionName: {
    												name: "shift_right_unsigned_dynamic",
    												nodeType: "YulIdentifier",
    												src: "22679:28:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "22679:51:3"
    										}
    									],
    									functionName: {
    										name: "not",
    										nodeType: "YulIdentifier",
    										src: "22675:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "22675:56:3"
    								},
    								variables: [
    									{
    										name: "mask",
    										nodeType: "YulTypedName",
    										src: "22667:4:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "22740:25:3",
    								value: {
    									"arguments": [
    										{
    											name: "data",
    											nodeType: "YulIdentifier",
    											src: "22754:4:3"
    										},
    										{
    											name: "mask",
    											nodeType: "YulIdentifier",
    											src: "22760:4:3"
    										}
    									],
    									functionName: {
    										name: "and",
    										nodeType: "YulIdentifier",
    										src: "22750:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "22750:15:3"
    								},
    								variableNames: [
    									{
    										name: "result",
    										nodeType: "YulIdentifier",
    										src: "22740:6:3"
    									}
    								]
    							}
    						]
    					},
    					name: "mask_bytes_dynamic",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "data",
    							nodeType: "YulTypedName",
    							src: "22630:4:3",
    							type: ""
    						},
    						{
    							name: "bytes",
    							nodeType: "YulTypedName",
    							src: "22636:5:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "result",
    							nodeType: "YulTypedName",
    							src: "22646:6:3",
    							type: ""
    						}
    					],
    					src: "22602:169:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "22857:214:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "22990:37:3",
    								value: {
    									"arguments": [
    										{
    											name: "data",
    											nodeType: "YulIdentifier",
    											src: "23017:4:3"
    										},
    										{
    											name: "len",
    											nodeType: "YulIdentifier",
    											src: "23023:3:3"
    										}
    									],
    									functionName: {
    										name: "mask_bytes_dynamic",
    										nodeType: "YulIdentifier",
    										src: "22998:18:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "22998:29:3"
    								},
    								variableNames: [
    									{
    										name: "data",
    										nodeType: "YulIdentifier",
    										src: "22990:4:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "23036:29:3",
    								value: {
    									"arguments": [
    										{
    											name: "data",
    											nodeType: "YulIdentifier",
    											src: "23047:4:3"
    										},
    										{
    											"arguments": [
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "23057:1:3",
    													type: "",
    													value: "2"
    												},
    												{
    													name: "len",
    													nodeType: "YulIdentifier",
    													src: "23060:3:3"
    												}
    											],
    											functionName: {
    												name: "mul",
    												nodeType: "YulIdentifier",
    												src: "23053:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "23053:11:3"
    										}
    									],
    									functionName: {
    										name: "or",
    										nodeType: "YulIdentifier",
    										src: "23044:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "23044:21:3"
    								},
    								variableNames: [
    									{
    										name: "used",
    										nodeType: "YulIdentifier",
    										src: "23036:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "extract_used_part_and_set_length_of_short_byte_array",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "data",
    							nodeType: "YulTypedName",
    							src: "22838:4:3",
    							type: ""
    						},
    						{
    							name: "len",
    							nodeType: "YulTypedName",
    							src: "22844:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "used",
    							nodeType: "YulTypedName",
    							src: "22852:4:3",
    							type: ""
    						}
    					],
    					src: "22776:295:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "23168:1303:3",
    						statements: [
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "23179:51:3",
    								value: {
    									"arguments": [
    										{
    											name: "src",
    											nodeType: "YulIdentifier",
    											src: "23226:3:3"
    										}
    									],
    									functionName: {
    										name: "array_length_t_string_memory_ptr",
    										nodeType: "YulIdentifier",
    										src: "23193:32:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "23193:37:3"
    								},
    								variables: [
    									{
    										name: "newLen",
    										nodeType: "YulTypedName",
    										src: "23183:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "23315:22:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x41",
    													nodeType: "YulIdentifier",
    													src: "23317:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "23317:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "23317:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "newLen",
    											nodeType: "YulIdentifier",
    											src: "23287:6:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "23295:18:3",
    											type: "",
    											value: "0xffffffffffffffff"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "23284:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "23284:30:3"
    								},
    								nodeType: "YulIf",
    								src: "23281:56:3"
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "23347:52:3",
    								value: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "slot",
    													nodeType: "YulIdentifier",
    													src: "23393:4:3"
    												}
    											],
    											functionName: {
    												name: "sload",
    												nodeType: "YulIdentifier",
    												src: "23387:5:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "23387:11:3"
    										}
    									],
    									functionName: {
    										name: "extract_byte_array_length",
    										nodeType: "YulIdentifier",
    										src: "23361:25:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "23361:38:3"
    								},
    								variables: [
    									{
    										name: "oldLen",
    										nodeType: "YulTypedName",
    										src: "23351:6:3",
    										type: ""
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "slot",
    											nodeType: "YulIdentifier",
    											src: "23492:4:3"
    										},
    										{
    											name: "oldLen",
    											nodeType: "YulIdentifier",
    											src: "23498:6:3"
    										},
    										{
    											name: "newLen",
    											nodeType: "YulIdentifier",
    											src: "23506:6:3"
    										}
    									],
    									functionName: {
    										name: "clean_up_bytearray_end_slots_t_string_storage",
    										nodeType: "YulIdentifier",
    										src: "23446:45:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "23446:67:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "23446:67:3"
    							},
    							{
    								nodeType: "YulVariableDeclaration",
    								src: "23523:18:3",
    								value: {
    									kind: "number",
    									nodeType: "YulLiteral",
    									src: "23540:1:3",
    									type: "",
    									value: "0"
    								},
    								variables: [
    									{
    										name: "srcOffset",
    										nodeType: "YulTypedName",
    										src: "23527:9:3",
    										type: ""
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "23551:17:3",
    								value: {
    									kind: "number",
    									nodeType: "YulLiteral",
    									src: "23564:4:3",
    									type: "",
    									value: "0x20"
    								},
    								variableNames: [
    									{
    										name: "srcOffset",
    										nodeType: "YulIdentifier",
    										src: "23551:9:3"
    									}
    								]
    							},
    							{
    								cases: [
    									{
    										body: {
    											nodeType: "YulBlock",
    											src: "23615:611:3",
    											statements: [
    												{
    													nodeType: "YulVariableDeclaration",
    													src: "23629:37:3",
    													value: {
    														"arguments": [
    															{
    																name: "newLen",
    																nodeType: "YulIdentifier",
    																src: "23648:6:3"
    															},
    															{
    																"arguments": [
    																	{
    																		kind: "number",
    																		nodeType: "YulLiteral",
    																		src: "23660:4:3",
    																		type: "",
    																		value: "0x1f"
    																	}
    																],
    																functionName: {
    																	name: "not",
    																	nodeType: "YulIdentifier",
    																	src: "23656:3:3"
    																},
    																nodeType: "YulFunctionCall",
    																src: "23656:9:3"
    															}
    														],
    														functionName: {
    															name: "and",
    															nodeType: "YulIdentifier",
    															src: "23644:3:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "23644:22:3"
    													},
    													variables: [
    														{
    															name: "loopEnd",
    															nodeType: "YulTypedName",
    															src: "23633:7:3",
    															type: ""
    														}
    													]
    												},
    												{
    													nodeType: "YulVariableDeclaration",
    													src: "23680:51:3",
    													value: {
    														"arguments": [
    															{
    																name: "slot",
    																nodeType: "YulIdentifier",
    																src: "23726:4:3"
    															}
    														],
    														functionName: {
    															name: "array_dataslot_t_string_storage",
    															nodeType: "YulIdentifier",
    															src: "23694:31:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "23694:37:3"
    													},
    													variables: [
    														{
    															name: "dstPtr",
    															nodeType: "YulTypedName",
    															src: "23684:6:3",
    															type: ""
    														}
    													]
    												},
    												{
    													nodeType: "YulVariableDeclaration",
    													src: "23744:10:3",
    													value: {
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "23753:1:3",
    														type: "",
    														value: "0"
    													},
    													variables: [
    														{
    															name: "i",
    															nodeType: "YulTypedName",
    															src: "23748:1:3",
    															type: ""
    														}
    													]
    												},
    												{
    													body: {
    														nodeType: "YulBlock",
    														src: "23812:163:3",
    														statements: [
    															{
    																expression: {
    																	"arguments": [
    																		{
    																			name: "dstPtr",
    																			nodeType: "YulIdentifier",
    																			src: "23837:6:3"
    																		},
    																		{
    																			"arguments": [
    																				{
    																					"arguments": [
    																						{
    																							name: "src",
    																							nodeType: "YulIdentifier",
    																							src: "23855:3:3"
    																						},
    																						{
    																							name: "srcOffset",
    																							nodeType: "YulIdentifier",
    																							src: "23860:9:3"
    																						}
    																					],
    																					functionName: {
    																						name: "add",
    																						nodeType: "YulIdentifier",
    																						src: "23851:3:3"
    																					},
    																					nodeType: "YulFunctionCall",
    																					src: "23851:19:3"
    																				}
    																			],
    																			functionName: {
    																				name: "mload",
    																				nodeType: "YulIdentifier",
    																				src: "23845:5:3"
    																			},
    																			nodeType: "YulFunctionCall",
    																			src: "23845:26:3"
    																		}
    																	],
    																	functionName: {
    																		name: "sstore",
    																		nodeType: "YulIdentifier",
    																		src: "23830:6:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "23830:42:3"
    																},
    																nodeType: "YulExpressionStatement",
    																src: "23830:42:3"
    															},
    															{
    																nodeType: "YulAssignment",
    																src: "23889:24:3",
    																value: {
    																	"arguments": [
    																		{
    																			name: "dstPtr",
    																			nodeType: "YulIdentifier",
    																			src: "23903:6:3"
    																		},
    																		{
    																			kind: "number",
    																			nodeType: "YulLiteral",
    																			src: "23911:1:3",
    																			type: "",
    																			value: "1"
    																		}
    																	],
    																	functionName: {
    																		name: "add",
    																		nodeType: "YulIdentifier",
    																		src: "23899:3:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "23899:14:3"
    																},
    																variableNames: [
    																	{
    																		name: "dstPtr",
    																		nodeType: "YulIdentifier",
    																		src: "23889:6:3"
    																	}
    																]
    															},
    															{
    																nodeType: "YulAssignment",
    																src: "23930:31:3",
    																value: {
    																	"arguments": [
    																		{
    																			name: "srcOffset",
    																			nodeType: "YulIdentifier",
    																			src: "23947:9:3"
    																		},
    																		{
    																			kind: "number",
    																			nodeType: "YulLiteral",
    																			src: "23958:2:3",
    																			type: "",
    																			value: "32"
    																		}
    																	],
    																	functionName: {
    																		name: "add",
    																		nodeType: "YulIdentifier",
    																		src: "23943:3:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "23943:18:3"
    																},
    																variableNames: [
    																	{
    																		name: "srcOffset",
    																		nodeType: "YulIdentifier",
    																		src: "23930:9:3"
    																	}
    																]
    															}
    														]
    													},
    													condition: {
    														"arguments": [
    															{
    																name: "i",
    																nodeType: "YulIdentifier",
    																src: "23778:1:3"
    															},
    															{
    																name: "loopEnd",
    																nodeType: "YulIdentifier",
    																src: "23781:7:3"
    															}
    														],
    														functionName: {
    															name: "lt",
    															nodeType: "YulIdentifier",
    															src: "23775:2:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "23775:14:3"
    													},
    													nodeType: "YulForLoop",
    													post: {
    														nodeType: "YulBlock",
    														src: "23790:21:3",
    														statements: [
    															{
    																nodeType: "YulAssignment",
    																src: "23792:17:3",
    																value: {
    																	"arguments": [
    																		{
    																			name: "i",
    																			nodeType: "YulIdentifier",
    																			src: "23801:1:3"
    																		},
    																		{
    																			kind: "number",
    																			nodeType: "YulLiteral",
    																			src: "23804:4:3",
    																			type: "",
    																			value: "0x20"
    																		}
    																	],
    																	functionName: {
    																		name: "add",
    																		nodeType: "YulIdentifier",
    																		src: "23797:3:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "23797:12:3"
    																},
    																variableNames: [
    																	{
    																		name: "i",
    																		nodeType: "YulIdentifier",
    																		src: "23792:1:3"
    																	}
    																]
    															}
    														]
    													},
    													pre: {
    														nodeType: "YulBlock",
    														src: "23771:3:3",
    														statements: [
    														]
    													},
    													src: "23767:208:3"
    												},
    												{
    													body: {
    														nodeType: "YulBlock",
    														src: "24011:156:3",
    														statements: [
    															{
    																nodeType: "YulVariableDeclaration",
    																src: "24029:43:3",
    																value: {
    																	"arguments": [
    																		{
    																			"arguments": [
    																				{
    																					name: "src",
    																					nodeType: "YulIdentifier",
    																					src: "24056:3:3"
    																				},
    																				{
    																					name: "srcOffset",
    																					nodeType: "YulIdentifier",
    																					src: "24061:9:3"
    																				}
    																			],
    																			functionName: {
    																				name: "add",
    																				nodeType: "YulIdentifier",
    																				src: "24052:3:3"
    																			},
    																			nodeType: "YulFunctionCall",
    																			src: "24052:19:3"
    																		}
    																	],
    																	functionName: {
    																		name: "mload",
    																		nodeType: "YulIdentifier",
    																		src: "24046:5:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "24046:26:3"
    																},
    																variables: [
    																	{
    																		name: "lastValue",
    																		nodeType: "YulTypedName",
    																		src: "24033:9:3",
    																		type: ""
    																	}
    																]
    															},
    															{
    																expression: {
    																	"arguments": [
    																		{
    																			name: "dstPtr",
    																			nodeType: "YulIdentifier",
    																			src: "24096:6:3"
    																		},
    																		{
    																			"arguments": [
    																				{
    																					name: "lastValue",
    																					nodeType: "YulIdentifier",
    																					src: "24123:9:3"
    																				},
    																				{
    																					"arguments": [
    																						{
    																							name: "newLen",
    																							nodeType: "YulIdentifier",
    																							src: "24138:6:3"
    																						},
    																						{
    																							kind: "number",
    																							nodeType: "YulLiteral",
    																							src: "24146:4:3",
    																							type: "",
    																							value: "0x1f"
    																						}
    																					],
    																					functionName: {
    																						name: "and",
    																						nodeType: "YulIdentifier",
    																						src: "24134:3:3"
    																					},
    																					nodeType: "YulFunctionCall",
    																					src: "24134:17:3"
    																				}
    																			],
    																			functionName: {
    																				name: "mask_bytes_dynamic",
    																				nodeType: "YulIdentifier",
    																				src: "24104:18:3"
    																			},
    																			nodeType: "YulFunctionCall",
    																			src: "24104:48:3"
    																		}
    																	],
    																	functionName: {
    																		name: "sstore",
    																		nodeType: "YulIdentifier",
    																		src: "24089:6:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "24089:64:3"
    																},
    																nodeType: "YulExpressionStatement",
    																src: "24089:64:3"
    															}
    														]
    													},
    													condition: {
    														"arguments": [
    															{
    																name: "loopEnd",
    																nodeType: "YulIdentifier",
    																src: "23994:7:3"
    															},
    															{
    																name: "newLen",
    																nodeType: "YulIdentifier",
    																src: "24003:6:3"
    															}
    														],
    														functionName: {
    															name: "lt",
    															nodeType: "YulIdentifier",
    															src: "23991:2:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "23991:19:3"
    													},
    													nodeType: "YulIf",
    													src: "23988:179:3"
    												},
    												{
    													expression: {
    														"arguments": [
    															{
    																name: "slot",
    																nodeType: "YulIdentifier",
    																src: "24187:4:3"
    															},
    															{
    																"arguments": [
    																	{
    																		"arguments": [
    																			{
    																				name: "newLen",
    																				nodeType: "YulIdentifier",
    																				src: "24201:6:3"
    																			},
    																			{
    																				kind: "number",
    																				nodeType: "YulLiteral",
    																				src: "24209:1:3",
    																				type: "",
    																				value: "2"
    																			}
    																		],
    																		functionName: {
    																			name: "mul",
    																			nodeType: "YulIdentifier",
    																			src: "24197:3:3"
    																		},
    																		nodeType: "YulFunctionCall",
    																		src: "24197:14:3"
    																	},
    																	{
    																		kind: "number",
    																		nodeType: "YulLiteral",
    																		src: "24213:1:3",
    																		type: "",
    																		value: "1"
    																	}
    																],
    																functionName: {
    																	name: "add",
    																	nodeType: "YulIdentifier",
    																	src: "24193:3:3"
    																},
    																nodeType: "YulFunctionCall",
    																src: "24193:22:3"
    															}
    														],
    														functionName: {
    															name: "sstore",
    															nodeType: "YulIdentifier",
    															src: "24180:6:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "24180:36:3"
    													},
    													nodeType: "YulExpressionStatement",
    													src: "24180:36:3"
    												}
    											]
    										},
    										nodeType: "YulCase",
    										src: "23608:618:3",
    										value: {
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "23613:1:3",
    											type: "",
    											value: "1"
    										}
    									},
    									{
    										body: {
    											nodeType: "YulBlock",
    											src: "24243:222:3",
    											statements: [
    												{
    													nodeType: "YulVariableDeclaration",
    													src: "24257:14:3",
    													value: {
    														kind: "number",
    														nodeType: "YulLiteral",
    														src: "24270:1:3",
    														type: "",
    														value: "0"
    													},
    													variables: [
    														{
    															name: "value",
    															nodeType: "YulTypedName",
    															src: "24261:5:3",
    															type: ""
    														}
    													]
    												},
    												{
    													body: {
    														nodeType: "YulBlock",
    														src: "24294:67:3",
    														statements: [
    															{
    																nodeType: "YulAssignment",
    																src: "24312:35:3",
    																value: {
    																	"arguments": [
    																		{
    																			"arguments": [
    																				{
    																					name: "src",
    																					nodeType: "YulIdentifier",
    																					src: "24331:3:3"
    																				},
    																				{
    																					name: "srcOffset",
    																					nodeType: "YulIdentifier",
    																					src: "24336:9:3"
    																				}
    																			],
    																			functionName: {
    																				name: "add",
    																				nodeType: "YulIdentifier",
    																				src: "24327:3:3"
    																			},
    																			nodeType: "YulFunctionCall",
    																			src: "24327:19:3"
    																		}
    																	],
    																	functionName: {
    																		name: "mload",
    																		nodeType: "YulIdentifier",
    																		src: "24321:5:3"
    																	},
    																	nodeType: "YulFunctionCall",
    																	src: "24321:26:3"
    																},
    																variableNames: [
    																	{
    																		name: "value",
    																		nodeType: "YulIdentifier",
    																		src: "24312:5:3"
    																	}
    																]
    															}
    														]
    													},
    													condition: {
    														name: "newLen",
    														nodeType: "YulIdentifier",
    														src: "24287:6:3"
    													},
    													nodeType: "YulIf",
    													src: "24284:77:3"
    												},
    												{
    													expression: {
    														"arguments": [
    															{
    																name: "slot",
    																nodeType: "YulIdentifier",
    																src: "24381:4:3"
    															},
    															{
    																"arguments": [
    																	{
    																		name: "value",
    																		nodeType: "YulIdentifier",
    																		src: "24440:5:3"
    																	},
    																	{
    																		name: "newLen",
    																		nodeType: "YulIdentifier",
    																		src: "24447:6:3"
    																	}
    																],
    																functionName: {
    																	name: "extract_used_part_and_set_length_of_short_byte_array",
    																	nodeType: "YulIdentifier",
    																	src: "24387:52:3"
    																},
    																nodeType: "YulFunctionCall",
    																src: "24387:67:3"
    															}
    														],
    														functionName: {
    															name: "sstore",
    															nodeType: "YulIdentifier",
    															src: "24374:6:3"
    														},
    														nodeType: "YulFunctionCall",
    														src: "24374:81:3"
    													},
    													nodeType: "YulExpressionStatement",
    													src: "24374:81:3"
    												}
    											]
    										},
    										nodeType: "YulCase",
    										src: "24235:230:3",
    										value: "default"
    									}
    								],
    								expression: {
    									"arguments": [
    										{
    											name: "newLen",
    											nodeType: "YulIdentifier",
    											src: "23588:6:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "23596:2:3",
    											type: "",
    											value: "31"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "23585:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "23585:14:3"
    								},
    								nodeType: "YulSwitch",
    								src: "23578:887:3"
    							}
    						]
    					},
    					name: "copy_byte_array_to_storage_from_t_string_memory_ptr_to_t_string_storage",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "slot",
    							nodeType: "YulTypedName",
    							src: "23157:4:3",
    							type: ""
    						},
    						{
    							name: "src",
    							nodeType: "YulTypedName",
    							src: "23163:3:3",
    							type: ""
    						}
    					],
    					src: "23076:1395:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "24522:149:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "24532:25:3",
    								value: {
    									"arguments": [
    										{
    											name: "x",
    											nodeType: "YulIdentifier",
    											src: "24555:1:3"
    										}
    									],
    									functionName: {
    										name: "cleanup_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "24537:17:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "24537:20:3"
    								},
    								variableNames: [
    									{
    										name: "x",
    										nodeType: "YulIdentifier",
    										src: "24532:1:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "24566:25:3",
    								value: {
    									"arguments": [
    										{
    											name: "y",
    											nodeType: "YulIdentifier",
    											src: "24589:1:3"
    										}
    									],
    									functionName: {
    										name: "cleanup_t_uint256",
    										nodeType: "YulIdentifier",
    										src: "24571:17:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "24571:20:3"
    								},
    								variableNames: [
    									{
    										name: "y",
    										nodeType: "YulIdentifier",
    										src: "24566:1:3"
    									}
    								]
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "24600:17:3",
    								value: {
    									"arguments": [
    										{
    											name: "x",
    											nodeType: "YulIdentifier",
    											src: "24612:1:3"
    										},
    										{
    											name: "y",
    											nodeType: "YulIdentifier",
    											src: "24615:1:3"
    										}
    									],
    									functionName: {
    										name: "sub",
    										nodeType: "YulIdentifier",
    										src: "24608:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "24608:9:3"
    								},
    								variableNames: [
    									{
    										name: "diff",
    										nodeType: "YulIdentifier",
    										src: "24600:4:3"
    									}
    								]
    							},
    							{
    								body: {
    									nodeType: "YulBlock",
    									src: "24642:22:3",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    												],
    												functionName: {
    													name: "panic_error_0x11",
    													nodeType: "YulIdentifier",
    													src: "24644:16:3"
    												},
    												nodeType: "YulFunctionCall",
    												src: "24644:18:3"
    											},
    											nodeType: "YulExpressionStatement",
    											src: "24644:18:3"
    										}
    									]
    								},
    								condition: {
    									"arguments": [
    										{
    											name: "diff",
    											nodeType: "YulIdentifier",
    											src: "24633:4:3"
    										},
    										{
    											name: "x",
    											nodeType: "YulIdentifier",
    											src: "24639:1:3"
    										}
    									],
    									functionName: {
    										name: "gt",
    										nodeType: "YulIdentifier",
    										src: "24630:2:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "24630:11:3"
    								},
    								nodeType: "YulIf",
    								src: "24627:37:3"
    							}
    						]
    					},
    					name: "checked_sub_t_uint256",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "x",
    							nodeType: "YulTypedName",
    							src: "24508:1:3",
    							type: ""
    						},
    						{
    							name: "y",
    							nodeType: "YulTypedName",
    							src: "24511:1:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "diff",
    							nodeType: "YulTypedName",
    							src: "24517:4:3",
    							type: ""
    						}
    					],
    					src: "24477:194:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "24783:116:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "24805:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "24813:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "24801:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "24801:14:3"
    										},
    										{
    											hexValue: "54686520766f74696e672073657373696f6e206973207374696c6c2061637469",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "24817:34:3",
    											type: "",
    											value: "The voting session is still acti"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "24794:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "24794:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "24794:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "24873:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "24881:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "24869:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "24869:15:3"
    										},
    										{
    											hexValue: "76652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "24886:5:3",
    											type: "",
    											value: "ve."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "24862:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "24862:30:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "24862:30:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "24775:6:3",
    							type: ""
    						}
    					],
    					src: "24677:222:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "25051:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "25061:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "25127:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "25132:2:3",
    											type: "",
    											value: "35"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "25068:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25068:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "25061:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "25233:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105",
    										nodeType: "YulIdentifier",
    										src: "25144:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25144:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "25144:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "25246:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "25257:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "25262:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "25253:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25253:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "25246:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "25039:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "25047:3:3",
    							type: ""
    						}
    					],
    					src: "24905:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "25448:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "25458:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "25470:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "25481:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "25466:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25466:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "25458:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "25505:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "25516:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "25501:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "25501:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "25524:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "25530:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "25520:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "25520:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "25494:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25494:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "25494:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "25550:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "25684:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "25558:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25558:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "25550:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "25428:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "25443:4:3",
    							type: ""
    						}
    					],
    					src: "25277:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "25808:128:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "25830:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "25838:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "25826:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "25826:14:3"
    										},
    										{
    											hexValue: "43616e6e6f7420656e642070726f706f73616c7320726567697374726174696f",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "25842:34:3",
    											type: "",
    											value: "Cannot end proposals registratio"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "25819:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25819:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "25819:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "25898:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "25906:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "25894:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "25894:15:3"
    										},
    										{
    											hexValue: "6e20617420746869732074696d652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "25911:17:3",
    											type: "",
    											value: "n at this time."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "25887:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "25887:42:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "25887:42:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "25800:6:3",
    							type: ""
    						}
    					],
    					src: "25702:234:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "26088:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "26098:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "26164:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "26169:2:3",
    											type: "",
    											value: "47"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "26105:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26105:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "26098:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "26270:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5",
    										nodeType: "YulIdentifier",
    										src: "26181:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26181:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "26181:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "26283:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "26294:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "26299:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "26290:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26290:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "26283:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "26076:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "26084:3:3",
    							type: ""
    						}
    					],
    					src: "25942:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "26485:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "26495:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "26507:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "26518:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "26503:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26503:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "26495:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "26542:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "26553:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "26538:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "26538:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "26561:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "26567:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "26557:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "26557:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "26531:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26531:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "26531:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "26587:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "26721:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "26595:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26595:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "26587:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "26465:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "26480:4:3",
    							type: ""
    						}
    					],
    					src: "26314:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "26897:238:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "26907:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "26919:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "26930:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "26915:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26915:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "26907:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value0",
    											nodeType: "YulIdentifier",
    											src: "27003:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "27016:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "27027:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "27012:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "27012:17:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack",
    										nodeType: "YulIdentifier",
    										src: "26943:59:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "26943:87:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "26943:87:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "value1",
    											nodeType: "YulIdentifier",
    											src: "27100:6:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "27113:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "27124:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "27109:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "27109:18:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack",
    										nodeType: "YulIdentifier",
    										src: "27040:59:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27040:88:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "27040:88:3"
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_enum$_WorkflowStatus_$159_t_enum$_WorkflowStatus_$159__to_t_uint8_t_uint8__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "26861:9:3",
    							type: ""
    						},
    						{
    							name: "value1",
    							nodeType: "YulTypedName",
    							src: "26873:6:3",
    							type: ""
    						},
    						{
    							name: "value0",
    							nodeType: "YulTypedName",
    							src: "26881:6:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "26892:4:3",
    							type: ""
    						}
    					],
    					src: "26739:396:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "27247:120:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "27269:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "27277:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "27265:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "27265:14:3"
    										},
    										{
    											hexValue: "43616e6e6f7420656e6420766f74696e672073657373696f6e20617420746869",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "27281:34:3",
    											type: "",
    											value: "Cannot end voting session at thi"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "27258:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27258:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "27258:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "27337:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "27345:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "27333:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "27333:15:3"
    										},
    										{
    											hexValue: "732074696d652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "27350:9:3",
    											type: "",
    											value: "s time."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "27326:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27326:34:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "27326:34:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "27239:6:3",
    							type: ""
    						}
    					],
    					src: "27141:226:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "27519:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "27529:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "27595:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "27600:2:3",
    											type: "",
    											value: "39"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "27536:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27536:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "27529:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "27701:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f",
    										nodeType: "YulIdentifier",
    										src: "27612:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27612:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "27612:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "27714:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "27725:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "27730:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "27721:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27721:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "27714:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "27507:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "27515:3:3",
    							type: ""
    						}
    					],
    					src: "27373:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "27916:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "27926:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "27938:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "27949:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "27934:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27934:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "27926:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "27973:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "27984:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "27969:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "27969:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "27992:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "27998:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "27988:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "27988:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "27962:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "27962:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "27962:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "28018:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "28152:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "28026:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28026:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "28018:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "27896:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "27911:4:3",
    							type: ""
    						}
    					],
    					src: "27745:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "28276:117:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "28298:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "28306:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "28294:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "28294:14:3"
    										},
    										{
    											hexValue: "43616e6e6f7420726567697374657220766f7465727320617420746869732074",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "28310:34:3",
    											type: "",
    											value: "Cannot register voters at this t"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "28287:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28287:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "28287:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "28366:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "28374:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "28362:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "28362:15:3"
    										},
    										{
    											hexValue: "696d652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "28379:6:3",
    											type: "",
    											value: "ime."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "28355:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28355:31:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "28355:31:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "28268:6:3",
    							type: ""
    						}
    					],
    					src: "28170:223:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "28545:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "28555:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "28621:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "28626:2:3",
    											type: "",
    											value: "36"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "28562:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28562:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "28555:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "28727:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da",
    										nodeType: "YulIdentifier",
    										src: "28638:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28638:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "28638:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "28740:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "28751:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "28756:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "28747:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28747:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "28740:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "28533:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "28541:3:3",
    							type: ""
    						}
    					],
    					src: "28399:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "28942:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "28952:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "28964:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "28975:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "28960:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28960:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "28952:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "28999:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "29010:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "28995:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "28995:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "29018:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "29024:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "29014:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "29014:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "28988:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "28988:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "28988:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "29044:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "29178:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "29052:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "29052:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "29044:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "28922:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "28937:4:3",
    							type: ""
    						}
    					],
    					src: "28771:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "29302:69:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "29324:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "29332:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "29320:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "29320:14:3"
    										},
    										{
    											hexValue: "566f74657220616c726561647920726567697374657265642e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "29336:27:3",
    											type: "",
    											value: "Voter already registered."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "29313:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "29313:51:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "29313:51:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "29294:6:3",
    							type: ""
    						}
    					],
    					src: "29196:175:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "29523:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "29533:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "29599:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "29604:2:3",
    											type: "",
    											value: "25"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "29540:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "29540:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "29533:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "29705:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c",
    										nodeType: "YulIdentifier",
    										src: "29616:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "29616:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "29616:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "29718:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "29729:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "29734:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "29725:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "29725:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "29718:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "29511:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "29519:3:3",
    							type: ""
    						}
    					],
    					src: "29377:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "29920:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "29930:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "29942:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "29953:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "29938:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "29938:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "29930:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "29977:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "29988:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "29973:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "29973:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "29996:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "30002:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "29992:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "29992:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "29966:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "29966:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "29966:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "30022:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "30156:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "30030:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "30030:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "30022:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "29900:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "29915:4:3",
    							type: ""
    						}
    					],
    					src: "29749:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "30280:130:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "30302:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "30310:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "30298:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "30298:14:3"
    										},
    										{
    											hexValue: "43616e6e6f742073746172742070726f706f73616c7320726567697374726174",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "30314:34:3",
    											type: "",
    											value: "Cannot start proposals registrat"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "30291:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "30291:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "30291:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "30370:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "30378:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "30366:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "30366:15:3"
    										},
    										{
    											hexValue: "696f6e20617420746869732074696d652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "30383:19:3",
    											type: "",
    											value: "ion at this time."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "30359:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "30359:44:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "30359:44:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "30272:6:3",
    							type: ""
    						}
    					],
    					src: "30174:236:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "30562:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "30572:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "30638:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "30643:2:3",
    											type: "",
    											value: "49"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "30579:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "30579:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "30572:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "30744:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de",
    										nodeType: "YulIdentifier",
    										src: "30655:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "30655:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "30655:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "30757:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "30768:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "30773:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "30764:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "30764:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "30757:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "30550:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "30558:3:3",
    							type: ""
    						}
    					],
    					src: "30416:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "30959:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "30969:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "30981:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "30992:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "30977:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "30977:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "30969:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "31016:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "31027:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "31012:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "31012:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "31035:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "31041:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "31031:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "31031:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "31005:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "31005:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "31005:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "31061:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "31195:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "31069:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "31069:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "31061:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "30939:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "30954:4:3",
    							type: ""
    						}
    					],
    					src: "30788:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "31319:122:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "31341:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "31349:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "31337:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "31337:14:3"
    										},
    										{
    											hexValue: "43616e6e6f7420737461727420766f74696e672073657373696f6e2061742074",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "31353:34:3",
    											type: "",
    											value: "Cannot start voting session at t"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "31330:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "31330:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "31330:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "31409:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "31417:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "31405:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "31405:15:3"
    										},
    										{
    											hexValue: "6869732074696d652e",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "31422:11:3",
    											type: "",
    											value: "his time."
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "31398:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "31398:36:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "31398:36:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "31311:6:3",
    							type: ""
    						}
    					],
    					src: "31213:228:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "31593:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "31603:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "31669:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "31674:2:3",
    											type: "",
    											value: "41"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "31610:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "31610:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "31603:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "31775:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0",
    										nodeType: "YulIdentifier",
    										src: "31686:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "31686:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "31686:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "31788:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "31799:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "31804:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "31795:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "31795:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "31788:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "31581:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "31589:3:3",
    							type: ""
    						}
    					],
    					src: "31447:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "31990:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "32000:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "32012:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "32023:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "32008:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32008:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "32000:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "32047:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "32058:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "32043:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "32043:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "32066:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "32072:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "32062:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "32062:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "32036:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32036:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "32036:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "32092:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "32226:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "32100:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32100:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "32092:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "31970:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "31985:4:3",
    							type: ""
    						}
    					],
    					src: "31819:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "32350:119:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "32372:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "32380:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "32368:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "32368:14:3"
    										},
    										{
    											hexValue: "4f776e61626c653a206e6577206f776e657220697320746865207a65726f2061",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "32384:34:3",
    											type: "",
    											value: "Ownable: new owner is the zero a"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "32361:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32361:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "32361:58:3"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "32440:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "32448:2:3",
    													type: "",
    													value: "32"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "32436:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "32436:15:3"
    										},
    										{
    											hexValue: "646472657373",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "32453:8:3",
    											type: "",
    											value: "ddress"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "32429:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32429:33:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "32429:33:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "32342:6:3",
    							type: ""
    						}
    					],
    					src: "32244:225:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "32621:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "32631:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "32697:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "32702:2:3",
    											type: "",
    											value: "38"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "32638:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32638:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "32631:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "32803:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe",
    										nodeType: "YulIdentifier",
    										src: "32714:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32714:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "32714:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "32816:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "32827:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "32832:2:3",
    											type: "",
    											value: "64"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "32823:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "32823:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "32816:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "32609:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "32617:3:3",
    							type: ""
    						}
    					],
    					src: "32475:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "33018:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "33028:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "33040:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "33051:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "33036:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "33036:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "33028:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "33075:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "33086:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "33071:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "33071:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "33094:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "33100:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "33090:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "33090:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "33064:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "33064:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "33064:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "33120:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "33254:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "33128:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "33128:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "33120:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "32998:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "33013:4:3",
    							type: ""
    						}
    					],
    					src: "32847:419:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "33378:76:3",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "memPtr",
    													nodeType: "YulIdentifier",
    													src: "33400:6:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "33408:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "33396:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "33396:14:3"
    										},
    										{
    											hexValue: "4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572",
    											kind: "string",
    											nodeType: "YulLiteral",
    											src: "33412:34:3",
    											type: "",
    											value: "Ownable: caller is not the owner"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "33389:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "33389:58:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "33389:58:3"
    							}
    						]
    					},
    					name: "store_literal_in_memory_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "memPtr",
    							nodeType: "YulTypedName",
    							src: "33370:6:3",
    							type: ""
    						}
    					],
    					src: "33272:182:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "33606:220:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "33616:74:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "33682:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "33687:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "array_storeLengthForEncoding_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "33623:58:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "33623:67:3"
    								},
    								variableNames: [
    									{
    										name: "pos",
    										nodeType: "YulIdentifier",
    										src: "33616:3:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "33788:3:3"
    										}
    									],
    									functionName: {
    										name: "store_literal_in_memory_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe",
    										nodeType: "YulIdentifier",
    										src: "33699:88:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "33699:93:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "33699:93:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "33801:19:3",
    								value: {
    									"arguments": [
    										{
    											name: "pos",
    											nodeType: "YulIdentifier",
    											src: "33812:3:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "33817:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "33808:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "33808:12:3"
    								},
    								variableNames: [
    									{
    										name: "end",
    										nodeType: "YulIdentifier",
    										src: "33801:3:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe_to_t_string_memory_ptr_fromStack",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "pos",
    							nodeType: "YulTypedName",
    							src: "33594:3:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "end",
    							nodeType: "YulTypedName",
    							src: "33602:3:3",
    							type: ""
    						}
    					],
    					src: "33460:366:3"
    				},
    				{
    					body: {
    						nodeType: "YulBlock",
    						src: "34003:248:3",
    						statements: [
    							{
    								nodeType: "YulAssignment",
    								src: "34013:26:3",
    								value: {
    									"arguments": [
    										{
    											name: "headStart",
    											nodeType: "YulIdentifier",
    											src: "34025:9:3"
    										},
    										{
    											kind: "number",
    											nodeType: "YulLiteral",
    											src: "34036:2:3",
    											type: "",
    											value: "32"
    										}
    									],
    									functionName: {
    										name: "add",
    										nodeType: "YulIdentifier",
    										src: "34021:3:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "34021:18:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "34013:4:3"
    									}
    								]
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											"arguments": [
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "34060:9:3"
    												},
    												{
    													kind: "number",
    													nodeType: "YulLiteral",
    													src: "34071:1:3",
    													type: "",
    													value: "0"
    												}
    											],
    											functionName: {
    												name: "add",
    												nodeType: "YulIdentifier",
    												src: "34056:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "34056:17:3"
    										},
    										{
    											"arguments": [
    												{
    													name: "tail",
    													nodeType: "YulIdentifier",
    													src: "34079:4:3"
    												},
    												{
    													name: "headStart",
    													nodeType: "YulIdentifier",
    													src: "34085:9:3"
    												}
    											],
    											functionName: {
    												name: "sub",
    												nodeType: "YulIdentifier",
    												src: "34075:3:3"
    											},
    											nodeType: "YulFunctionCall",
    											src: "34075:20:3"
    										}
    									],
    									functionName: {
    										name: "mstore",
    										nodeType: "YulIdentifier",
    										src: "34049:6:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "34049:47:3"
    								},
    								nodeType: "YulExpressionStatement",
    								src: "34049:47:3"
    							},
    							{
    								nodeType: "YulAssignment",
    								src: "34105:139:3",
    								value: {
    									"arguments": [
    										{
    											name: "tail",
    											nodeType: "YulIdentifier",
    											src: "34239:4:3"
    										}
    									],
    									functionName: {
    										name: "abi_encode_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe_to_t_string_memory_ptr_fromStack",
    										nodeType: "YulIdentifier",
    										src: "34113:124:3"
    									},
    									nodeType: "YulFunctionCall",
    									src: "34113:131:3"
    								},
    								variableNames: [
    									{
    										name: "tail",
    										nodeType: "YulIdentifier",
    										src: "34105:4:3"
    									}
    								]
    							}
    						]
    					},
    					name: "abi_encode_tuple_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe__to_t_string_memory_ptr__fromStack_reversed",
    					nodeType: "YulFunctionDefinition",
    					parameters: [
    						{
    							name: "headStart",
    							nodeType: "YulTypedName",
    							src: "33983:9:3",
    							type: ""
    						}
    					],
    					returnVariables: [
    						{
    							name: "tail",
    							nodeType: "YulTypedName",
    							src: "33998:4:3",
    							type: ""
    						}
    					],
    					src: "33832:419:3"
    				}
    			]
    		},
    		contents: "{\n\n    function allocate_unbounded() -> memPtr {\n        memPtr := mload(64)\n    }\n\n    function revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() {\n        revert(0, 0)\n    }\n\n    function revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() {\n        revert(0, 0)\n    }\n\n    function cleanup_t_uint256(value) -> cleaned {\n        cleaned := value\n    }\n\n    function validator_revert_t_uint256(value) {\n        if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }\n    }\n\n    function abi_decode_t_uint256(offset, end) -> value {\n        value := calldataload(offset)\n        validator_revert_t_uint256(value)\n    }\n\n    function abi_decode_tuple_t_uint256(headStart, dataEnd) -> value0 {\n        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }\n\n        {\n\n            let offset := 0\n\n            value0 := abi_decode_t_uint256(add(headStart, offset), dataEnd)\n        }\n\n    }\n\n    function revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() {\n        revert(0, 0)\n    }\n\n    function revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae() {\n        revert(0, 0)\n    }\n\n    function round_up_to_mul_of_32(value) -> result {\n        result := and(add(value, 31), not(31))\n    }\n\n    function panic_error_0x41() {\n        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)\n        mstore(4, 0x41)\n        revert(0, 0x24)\n    }\n\n    function finalize_allocation(memPtr, size) {\n        let newFreePtr := add(memPtr, round_up_to_mul_of_32(size))\n        // protect against overflow\n        if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }\n        mstore(64, newFreePtr)\n    }\n\n    function allocate_memory(size) -> memPtr {\n        memPtr := allocate_unbounded()\n        finalize_allocation(memPtr, size)\n    }\n\n    function array_allocation_size_t_string_memory_ptr(length) -> size {\n        // Make sure we can allocate memory without overflow\n        if gt(length, 0xffffffffffffffff) { panic_error_0x41() }\n\n        size := round_up_to_mul_of_32(length)\n\n        // add length slot\n        size := add(size, 0x20)\n\n    }\n\n    function copy_calldata_to_memory_with_cleanup(src, dst, length) {\n        calldatacopy(dst, src, length)\n        mstore(add(dst, length), 0)\n    }\n\n    function abi_decode_available_length_t_string_memory_ptr(src, length, end) -> array {\n        array := allocate_memory(array_allocation_size_t_string_memory_ptr(length))\n        mstore(array, length)\n        let dst := add(array, 0x20)\n        if gt(add(src, length), end) { revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae() }\n        copy_calldata_to_memory_with_cleanup(src, dst, length)\n    }\n\n    // string\n    function abi_decode_t_string_memory_ptr(offset, end) -> array {\n        if iszero(slt(add(offset, 0x1f), end)) { revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() }\n        let length := calldataload(offset)\n        array := abi_decode_available_length_t_string_memory_ptr(add(offset, 0x20), length, end)\n    }\n\n    function abi_decode_tuple_t_string_memory_ptr(headStart, dataEnd) -> value0 {\n        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }\n\n        {\n\n            let offset := calldataload(add(headStart, 0))\n            if gt(offset, 0xffffffffffffffff) { revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() }\n\n            value0 := abi_decode_t_string_memory_ptr(add(headStart, offset), dataEnd)\n        }\n\n    }\n\n    function cleanup_t_uint160(value) -> cleaned {\n        cleaned := and(value, 0xffffffffffffffffffffffffffffffffffffffff)\n    }\n\n    function cleanup_t_address(value) -> cleaned {\n        cleaned := cleanup_t_uint160(value)\n    }\n\n    function abi_encode_t_address_to_t_address_fromStack(value, pos) {\n        mstore(pos, cleanup_t_address(value))\n    }\n\n    function abi_encode_tuple_t_address__to_t_address__fromStack_reversed(headStart , value0) -> tail {\n        tail := add(headStart, 32)\n\n        abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))\n\n    }\n\n    function array_length_t_string_memory_ptr(value) -> length {\n\n        length := mload(value)\n\n    }\n\n    function array_storeLengthForEncoding_t_string_memory_ptr(pos, length) -> updated_pos {\n        mstore(pos, length)\n        updated_pos := add(pos, 0x20)\n    }\n\n    function copy_memory_to_memory_with_cleanup(src, dst, length) {\n        let i := 0\n        for { } lt(i, length) { i := add(i, 32) }\n        {\n            mstore(add(dst, i), mload(add(src, i)))\n        }\n        mstore(add(dst, length), 0)\n    }\n\n    function abi_encode_t_string_memory_ptr_to_t_string_memory_ptr(value, pos) -> end {\n        let length := array_length_t_string_memory_ptr(value)\n        pos := array_storeLengthForEncoding_t_string_memory_ptr(pos, length)\n        copy_memory_to_memory_with_cleanup(add(value, 0x20), pos, length)\n        end := add(pos, round_up_to_mul_of_32(length))\n    }\n\n    function abi_encode_t_uint256_to_t_uint256(value, pos) {\n        mstore(pos, cleanup_t_uint256(value))\n    }\n\n    // struct Voting.Proposal -> struct Voting.Proposal\n    function abi_encode_t_struct$_Proposal_$152_memory_ptr_to_t_struct$_Proposal_$152_memory_ptr_fromStack(value, pos)  -> end  {\n        let tail := add(pos, 0x40)\n\n        {\n            // description\n\n            let memberValue0 := mload(add(value, 0x00))\n\n            mstore(add(pos, 0x00), sub(tail, pos))\n            tail := abi_encode_t_string_memory_ptr_to_t_string_memory_ptr(memberValue0, tail)\n\n        }\n\n        {\n            // voteCount\n\n            let memberValue0 := mload(add(value, 0x20))\n            abi_encode_t_uint256_to_t_uint256(memberValue0, add(pos, 0x20))\n        }\n\n        end := tail\n    }\n\n    function abi_encode_tuple_t_struct$_Proposal_$152_memory_ptr__to_t_struct$_Proposal_$152_memory_ptr__fromStack_reversed(headStart , value0) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_struct$_Proposal_$152_memory_ptr_to_t_struct$_Proposal_$152_memory_ptr_fromStack(value0,  tail)\n\n    }\n\n    function abi_encode_t_uint256_to_t_uint256_fromStack(value, pos) {\n        mstore(pos, cleanup_t_uint256(value))\n    }\n\n    function abi_encode_tuple_t_uint256__to_t_uint256__fromStack_reversed(headStart , value0) -> tail {\n        tail := add(headStart, 32)\n\n        abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))\n\n    }\n\n    function array_allocation_size_t_array$_t_address_$dyn_memory_ptr(length) -> size {\n        // Make sure we can allocate memory without overflow\n        if gt(length, 0xffffffffffffffff) { panic_error_0x41() }\n\n        size := mul(length, 0x20)\n\n        // add length slot\n        size := add(size, 0x20)\n\n    }\n\n    function revert_error_81385d8c0b31fffe14be1da910c8bd3a80be4cfa248e04f42ec0faea3132a8ef() {\n        revert(0, 0)\n    }\n\n    function validator_revert_t_address(value) {\n        if iszero(eq(value, cleanup_t_address(value))) { revert(0, 0) }\n    }\n\n    function abi_decode_t_address(offset, end) -> value {\n        value := calldataload(offset)\n        validator_revert_t_address(value)\n    }\n\n    // address[]\n    function abi_decode_available_length_t_array$_t_address_$dyn_memory_ptr(offset, length, end) -> array {\n        array := allocate_memory(array_allocation_size_t_array$_t_address_$dyn_memory_ptr(length))\n        let dst := array\n\n        mstore(array, length)\n        dst := add(array, 0x20)\n\n        let srcEnd := add(offset, mul(length, 0x20))\n        if gt(srcEnd, end) {\n            revert_error_81385d8c0b31fffe14be1da910c8bd3a80be4cfa248e04f42ec0faea3132a8ef()\n        }\n        for { let src := offset } lt(src, srcEnd) { src := add(src, 0x20) }\n        {\n\n            let elementPos := src\n\n            mstore(dst, abi_decode_t_address(elementPos, end))\n            dst := add(dst, 0x20)\n        }\n    }\n\n    // address[]\n    function abi_decode_t_array$_t_address_$dyn_memory_ptr(offset, end) -> array {\n        if iszero(slt(add(offset, 0x1f), end)) { revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() }\n        let length := calldataload(offset)\n        array := abi_decode_available_length_t_array$_t_address_$dyn_memory_ptr(add(offset, 0x20), length, end)\n    }\n\n    function abi_decode_tuple_t_array$_t_address_$dyn_memory_ptr(headStart, dataEnd) -> value0 {\n        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }\n\n        {\n\n            let offset := calldataload(add(headStart, 0))\n            if gt(offset, 0xffffffffffffffff) { revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() }\n\n            value0 := abi_decode_t_array$_t_address_$dyn_memory_ptr(add(headStart, offset), dataEnd)\n        }\n\n    }\n\n    function abi_decode_tuple_t_address(headStart, dataEnd) -> value0 {\n        if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }\n\n        {\n\n            let offset := 0\n\n            value0 := abi_decode_t_address(add(headStart, offset), dataEnd)\n        }\n\n    }\n\n    function panic_error_0x21() {\n        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)\n        mstore(4, 0x21)\n        revert(0, 0x24)\n    }\n\n    function validator_assert_t_enum$_WorkflowStatus_$159(value) {\n        if iszero(lt(value, 6)) { panic_error_0x21() }\n    }\n\n    function cleanup_t_enum$_WorkflowStatus_$159(value) -> cleaned {\n        cleaned := value validator_assert_t_enum$_WorkflowStatus_$159(value)\n    }\n\n    function convert_t_enum$_WorkflowStatus_$159_to_t_uint8(value) -> converted {\n        converted := cleanup_t_enum$_WorkflowStatus_$159(value)\n    }\n\n    function abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack(value, pos) {\n        mstore(pos, convert_t_enum$_WorkflowStatus_$159_to_t_uint8(value))\n    }\n\n    function abi_encode_tuple_t_enum$_WorkflowStatus_$159__to_t_uint8__fromStack_reversed(headStart , value0) -> tail {\n        tail := add(headStart, 32)\n\n        abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack(value0,  add(headStart, 0))\n\n    }\n\n    function array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, length) -> updated_pos {\n        mstore(pos, length)\n        updated_pos := add(pos, 0x20)\n    }\n\n    function store_literal_in_memory_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473(memPtr) {\n\n        mstore(add(memPtr, 0), \"You are not registered to vote.\")\n\n    }\n\n    function abi_encode_t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 31)\n        store_literal_in_memory_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473(pos)\n        end := add(pos, 32)\n    }\n\n    function abi_encode_tuple_t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018(memPtr) {\n\n        mstore(add(memPtr, 0), \"The voting session is not active\")\n\n        mstore(add(memPtr, 32), \".\")\n\n    }\n\n    function abi_encode_t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 33)\n        store_literal_in_memory_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863(memPtr) {\n\n        mstore(add(memPtr, 0), \"You have already voted.\")\n\n    }\n\n    function abi_encode_t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 23)\n        store_literal_in_memory_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863(pos)\n        end := add(pos, 32)\n    }\n\n    function abi_encode_tuple_t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function panic_error_0x32() {\n        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)\n        mstore(4, 0x32)\n        revert(0, 0x24)\n    }\n\n    function panic_error_0x11() {\n        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)\n        mstore(4, 0x11)\n        revert(0, 0x24)\n    }\n\n    function increment_t_uint256(value) -> ret {\n        value := cleanup_t_uint256(value)\n        if eq(value, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff) { panic_error_0x11() }\n        ret := add(value, 1)\n    }\n\n    function abi_encode_tuple_t_address_t_uint256__to_t_address_t_uint256__fromStack_reversed(headStart , value1, value0) -> tail {\n        tail := add(headStart, 64)\n\n        abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))\n\n        abi_encode_t_uint256_to_t_uint256_fromStack(value1,  add(headStart, 32))\n\n    }\n\n    function store_literal_in_memory_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943(memPtr) {\n\n        mstore(add(memPtr, 0), \"Proposals registration is not ac\")\n\n        mstore(add(memPtr, 32), \"tive.\")\n\n    }\n\n    function abi_encode_t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 37)\n        store_literal_in_memory_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack(pos, length) -> updated_pos {\n        updated_pos := pos\n    }\n\n    function abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_nonPadded_inplace_fromStack(value, pos) -> end {\n        let length := array_length_t_string_memory_ptr(value)\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack(pos, length)\n        copy_memory_to_memory_with_cleanup(add(value, 0x20), pos, length)\n        end := add(pos, length)\n    }\n\n    function abi_encode_tuple_packed_t_string_memory_ptr__to_t_string_memory_ptr__nonPadded_inplace_fromStack_reversed(pos , value0) -> end {\n\n        pos := abi_encode_t_string_memory_ptr_to_t_string_memory_ptr_nonPadded_inplace_fromStack(value0,  pos)\n\n        end := pos\n    }\n\n    function store_literal_in_memory_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5(memPtr) {\n\n        mstore(add(memPtr, 0), \"Proposal can't be null\")\n\n    }\n\n    function abi_encode_t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 22)\n        store_literal_in_memory_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5(pos)\n        end := add(pos, 32)\n    }\n\n    function abi_encode_tuple_t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function panic_error_0x22() {\n        mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)\n        mstore(4, 0x22)\n        revert(0, 0x24)\n    }\n\n    function extract_byte_array_length(data) -> length {\n        length := div(data, 2)\n        let outOfPlaceEncoding := and(data, 1)\n        if iszero(outOfPlaceEncoding) {\n            length := and(length, 0x7f)\n        }\n\n        if eq(outOfPlaceEncoding, lt(length, 32)) {\n            panic_error_0x22()\n        }\n    }\n\n    function array_dataslot_t_string_storage(ptr) -> data {\n        data := ptr\n\n        mstore(0, ptr)\n        data := keccak256(0, 0x20)\n\n    }\n\n    // string -> string\n    function abi_encode_t_string_storage_to_t_string_memory_ptr_nonPadded_inplace_fromStack(value, pos) -> ret {\n        let slotValue := sload(value)\n        let length := extract_byte_array_length(slotValue)\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_nonPadded_inplace_fromStack(pos, length)\n        switch and(slotValue, 1)\n        case 0 {\n            // short byte array\n            mstore(pos, and(slotValue, not(0xff)))\n            ret := add(pos, mul(length, iszero(iszero(length))))\n        }\n        case 1 {\n            // long byte array\n            let dataPos := array_dataslot_t_string_storage(value)\n            let i := 0\n            for { } lt(i, length) { i := add(i, 0x20) } {\n                mstore(add(pos, i), sload(dataPos))\n                dataPos := add(dataPos, 1)\n            }\n            ret := add(pos, length)\n        }\n    }\n\n    function abi_encode_tuple_packed_t_string_storage__to_t_string_memory_ptr__nonPadded_inplace_fromStack_reversed(pos , value0) -> end {\n\n        pos := abi_encode_t_string_storage_to_t_string_memory_ptr_nonPadded_inplace_fromStack(value0,  pos)\n\n        end := pos\n    }\n\n    function store_literal_in_memory_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b(memPtr) {\n\n        mstore(add(memPtr, 0), \"Proposal already registered.\")\n\n    }\n\n    function abi_encode_t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 28)\n        store_literal_in_memory_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b(pos)\n        end := add(pos, 32)\n    }\n\n    function abi_encode_tuple_t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function divide_by_32_ceil(value) -> result {\n        result := div(add(value, 31), 32)\n    }\n\n    function shift_left_dynamic(bits, value) -> newValue {\n        newValue :=\n\n        shl(bits, value)\n\n    }\n\n    function update_byte_slice_dynamic32(value, shiftBytes, toInsert) -> result {\n        let shiftBits := mul(shiftBytes, 8)\n        let mask := shift_left_dynamic(shiftBits, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)\n        toInsert := shift_left_dynamic(shiftBits, toInsert)\n        value := and(value, not(mask))\n        result := or(value, and(toInsert, mask))\n    }\n\n    function identity(value) -> ret {\n        ret := value\n    }\n\n    function convert_t_uint256_to_t_uint256(value) -> converted {\n        converted := cleanup_t_uint256(identity(cleanup_t_uint256(value)))\n    }\n\n    function prepare_store_t_uint256(value) -> ret {\n        ret := value\n    }\n\n    function update_storage_value_t_uint256_to_t_uint256(slot, offset, value_0) {\n        let convertedValue_0 := convert_t_uint256_to_t_uint256(value_0)\n        sstore(slot, update_byte_slice_dynamic32(sload(slot), offset, prepare_store_t_uint256(convertedValue_0)))\n    }\n\n    function zero_value_for_split_t_uint256() -> ret {\n        ret := 0\n    }\n\n    function storage_set_to_zero_t_uint256(slot, offset) {\n        let zero_0 := zero_value_for_split_t_uint256()\n        update_storage_value_t_uint256_to_t_uint256(slot, offset, zero_0)\n    }\n\n    function clear_storage_range_t_bytes1(start, end) {\n        for {} lt(start, end) { start := add(start, 1) }\n        {\n            storage_set_to_zero_t_uint256(start, 0)\n        }\n    }\n\n    function clean_up_bytearray_end_slots_t_string_storage(array, len, startIndex) {\n\n        if gt(len, 31) {\n            let dataArea := array_dataslot_t_string_storage(array)\n            let deleteStart := add(dataArea, divide_by_32_ceil(startIndex))\n            // If we are clearing array to be short byte array, we want to clear only data starting from array data area.\n            if lt(startIndex, 32) { deleteStart := dataArea }\n            clear_storage_range_t_bytes1(deleteStart, add(dataArea, divide_by_32_ceil(len)))\n        }\n\n    }\n\n    function shift_right_unsigned_dynamic(bits, value) -> newValue {\n        newValue :=\n\n        shr(bits, value)\n\n    }\n\n    function mask_bytes_dynamic(data, bytes) -> result {\n        let mask := not(shift_right_unsigned_dynamic(mul(8, bytes), not(0)))\n        result := and(data, mask)\n    }\n    function extract_used_part_and_set_length_of_short_byte_array(data, len) -> used {\n        // we want to save only elements that are part of the array after resizing\n        // others should be set to zero\n        data := mask_bytes_dynamic(data, len)\n        used := or(data, mul(2, len))\n    }\n    function copy_byte_array_to_storage_from_t_string_memory_ptr_to_t_string_storage(slot, src) {\n\n        let newLen := array_length_t_string_memory_ptr(src)\n        // Make sure array length is sane\n        if gt(newLen, 0xffffffffffffffff) { panic_error_0x41() }\n\n        let oldLen := extract_byte_array_length(sload(slot))\n\n        // potentially truncate data\n        clean_up_bytearray_end_slots_t_string_storage(slot, oldLen, newLen)\n\n        let srcOffset := 0\n\n        srcOffset := 0x20\n\n        switch gt(newLen, 31)\n        case 1 {\n            let loopEnd := and(newLen, not(0x1f))\n\n            let dstPtr := array_dataslot_t_string_storage(slot)\n            let i := 0\n            for { } lt(i, loopEnd) { i := add(i, 0x20) } {\n                sstore(dstPtr, mload(add(src, srcOffset)))\n                dstPtr := add(dstPtr, 1)\n                srcOffset := add(srcOffset, 32)\n            }\n            if lt(loopEnd, newLen) {\n                let lastValue := mload(add(src, srcOffset))\n                sstore(dstPtr, mask_bytes_dynamic(lastValue, and(newLen, 0x1f)))\n            }\n            sstore(slot, add(mul(newLen, 2), 1))\n        }\n        default {\n            let value := 0\n            if newLen {\n                value := mload(add(src, srcOffset))\n            }\n            sstore(slot, extract_used_part_and_set_length_of_short_byte_array(value, newLen))\n        }\n    }\n\n    function checked_sub_t_uint256(x, y) -> diff {\n        x := cleanup_t_uint256(x)\n        y := cleanup_t_uint256(y)\n        diff := sub(x, y)\n\n        if gt(diff, x) { panic_error_0x11() }\n\n    }\n\n    function store_literal_in_memory_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105(memPtr) {\n\n        mstore(add(memPtr, 0), \"The voting session is still acti\")\n\n        mstore(add(memPtr, 32), \"ve.\")\n\n    }\n\n    function abi_encode_t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 35)\n        store_literal_in_memory_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5(memPtr) {\n\n        mstore(add(memPtr, 0), \"Cannot end proposals registratio\")\n\n        mstore(add(memPtr, 32), \"n at this time.\")\n\n    }\n\n    function abi_encode_t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 47)\n        store_literal_in_memory_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function abi_encode_tuple_t_enum$_WorkflowStatus_$159_t_enum$_WorkflowStatus_$159__to_t_uint8_t_uint8__fromStack_reversed(headStart , value1, value0) -> tail {\n        tail := add(headStart, 64)\n\n        abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack(value0,  add(headStart, 0))\n\n        abi_encode_t_enum$_WorkflowStatus_$159_to_t_uint8_fromStack(value1,  add(headStart, 32))\n\n    }\n\n    function store_literal_in_memory_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f(memPtr) {\n\n        mstore(add(memPtr, 0), \"Cannot end voting session at thi\")\n\n        mstore(add(memPtr, 32), \"s time.\")\n\n    }\n\n    function abi_encode_t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 39)\n        store_literal_in_memory_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da(memPtr) {\n\n        mstore(add(memPtr, 0), \"Cannot register voters at this t\")\n\n        mstore(add(memPtr, 32), \"ime.\")\n\n    }\n\n    function abi_encode_t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 36)\n        store_literal_in_memory_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c(memPtr) {\n\n        mstore(add(memPtr, 0), \"Voter already registered.\")\n\n    }\n\n    function abi_encode_t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 25)\n        store_literal_in_memory_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c(pos)\n        end := add(pos, 32)\n    }\n\n    function abi_encode_tuple_t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de(memPtr) {\n\n        mstore(add(memPtr, 0), \"Cannot start proposals registrat\")\n\n        mstore(add(memPtr, 32), \"ion at this time.\")\n\n    }\n\n    function abi_encode_t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 49)\n        store_literal_in_memory_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0(memPtr) {\n\n        mstore(add(memPtr, 0), \"Cannot start voting session at t\")\n\n        mstore(add(memPtr, 32), \"his time.\")\n\n    }\n\n    function abi_encode_t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 41)\n        store_literal_in_memory_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe(memPtr) {\n\n        mstore(add(memPtr, 0), \"Ownable: new owner is the zero a\")\n\n        mstore(add(memPtr, 32), \"ddress\")\n\n    }\n\n    function abi_encode_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 38)\n        store_literal_in_memory_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe(pos)\n        end := add(pos, 64)\n    }\n\n    function abi_encode_tuple_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_245f15ff17f551913a7a18385165551503906a406f905ac1c2437281a7cd0cfe_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n    function store_literal_in_memory_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe(memPtr) {\n\n        mstore(add(memPtr, 0), \"Ownable: caller is not the owner\")\n\n    }\n\n    function abi_encode_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe_to_t_string_memory_ptr_fromStack(pos) -> end {\n        pos := array_storeLengthForEncoding_t_string_memory_ptr_fromStack(pos, 32)\n        store_literal_in_memory_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe(pos)\n        end := add(pos, 32)\n    }\n\n    function abi_encode_tuple_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe__to_t_string_memory_ptr__fromStack_reversed(headStart ) -> tail {\n        tail := add(headStart, 32)\n\n        mstore(add(headStart, 0), sub(tail, headStart))\n        tail := abi_encode_t_stringliteral_9924ebdf1add33d25d4ef888e16131f0a5687b0580a36c21b5c301a6c462effe_to_t_string_memory_ptr_fromStack( tail)\n\n    }\n\n}\n",
    		id: 3,
    		language: "Yul",
    		name: "#utility.yul"
    	}
    ];
    var sourceMap = "276:9323:2:-:0;;;;;;;;;;;;;936:32:0;955:12;:10;;;:12;;:::i;:::-;936:18;;;:32;;:::i;:::-;276:9323:2;;640:96:1;693:7;719:10;712:17;;640:96;:::o;2433:187:0:-;2506:16;2525:6;;;;;;;;;;;2506:25;;2550:8;2541:6;;:17;;;;;;;;;;;;;;;;;;2604:8;2573:40;;2594:8;2573:40;;;;;;;;;;;;2496:124;2433:187;:::o;276:9323:2:-;;;;;;;";
    var deployedSourceMap = "276:9323:2:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;7715:751;;;;;;;;;;;;;:::i;:::-;;:::i;:::-;;6692:897;;;;;;;;;;;;;:::i;:::-;;:::i;:::-;;8568:946;;;:::i;:::-;;4450:674;;;:::i;:::-;;1831:101:0;;;:::i;:::-;;1201:85;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;2306:129:2;;;;;;;;;;;;;:::i;:::-;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;5927:610;;;:::i;:::-;;2548:100;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;2807:821;;;;;;;;;;;;;:::i;:::-;;:::i;:::-;;3713:654;;;:::i;:::-;;5207:639;;;:::i;:::-;;2081:198:0;;;;;;;;;;;;;:::i;:::-;;:::i;:::-;;2183:115:2;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;9522:72;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;7715:751;1320:6;:18;1327:10;1320:18;;;;;;;;;;;;;;;:31;;;;;;;;;;;;1312:75;;;;;;;;;;;;:::i;:::-;;;;;;;;;1494:35:::1;1469:60;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:60;;;;;;;;:::i;:::-;;;1461:106;;;;;;;;;;;;:::i;:::-;;;;;;;;;7871:19:::2;7893:6;:18;7900:10;7893:18;;;;;;;;;;;;;;;7871:40;;7986:5;:14;;;;;;;;;;;;7985:15;7977:51;;;;;;;;;;;;:::i;:::-;;;;;;;;;8133:4;8116:5;:14;;;:21;;;;;;;;;;;;;;;;;;8172:11;8148:5;:21;;:35;;;;8274:9;8284:11;8274:22;;;;;;;;:::i;:::-;;;;;;;;;;;;:32;;;:34;;;;;;;;;:::i;:::-;;;;;;8428:30;8434:10;8446:11;8428:30;;;;;;;:::i;:::-;;;;;;;;7791:675;7715:751:::0;:::o;6692:897::-;1320:6;:18;1327:10;1320:18;;;;;;;;;;;;;;;:31;;;;;;;;;;;;1312:75;;;;;;;;;;;;:::i;:::-;;;;;;;;;1866:43:::1;1841:68;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:68;;;;;;;;:::i;:::-;;;1833:118;;;;;;;;;;;;:::i;:::-;;;;;;;;;7013:13:::2;6995:12;6978:30;;;;;;;;:::i;:::-;;;;;;;;;;;;;6968:41;;;;;;:58:::0;6960:93:::2;;;;;;;;;;;;:::i;:::-;;;;;;;;;7069:6;7064:518;7085:9;:16;;;;7081:1;:20;7064:518;;;7215:12;7198:30;;;;;;;;:::i;:::-;;;;;;;;;;;;;7188:41;;;;;;7158:9;7168:1;7158:12;;;;;;;;:::i;:::-;;;;;;;;;;;;:24;;7141:42;;;;;;;;:::i;:::-;;;;;;;;;;;;;7131:53;;;;;;:98:::0;7123:139:::2;;;;;;;;;;;;:::i;:::-;;;;;;;;;7277:9;7292:100;;;;;;;;7333:12;7292:100;;;;7375:1;7292:100;;::::0;7277:116:::2;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;7530:40;7568:1;7549:9;:16;;;;:20;;;;:::i;:::-;7530:40;;;;;;:::i;:::-;;;;;;;;7103:3;;;;;:::i;:::-;;;;7064:518;;;;6692:897:::0;:::o;8568:946::-;1094:13:0;:11;:13::i;:::-;1678:33:2::1;1653:58;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:58;;;;;;;;:::i;:::-;;;1645:106;;;;;;;;;;;;:::i;:::-;;;;;;;;;8758:21:::2;8794:25:::0;8898:6:::2;8893:409;8914:9;:16;;;;8910:1;:20;8893:409;;;9154:16;9129:9;9139:1;9129:12;;;;;;;;:::i;:::-;;;;;;;;;;;;:22;;;:41;9125:166;;;9210:9;9220:1;9210:12;;;;;;;;:::i;:::-;;;;;;;;;;;;:22;;;9191:41;;9274:1;9251:24;;9125:166;8932:3;;;;;:::i;:::-;;;;8893:409;;;;9424:20;9404:17;:40;;;;9479:27;9455:21;;:51;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;8637:877;;8568:946::o:0;4450:674::-;1094:13:0;:11;:13::i;:::-;4647:43:2::1;4622:68;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:68;;;;;;;;:::i;:::-;;;4614:128;;;;;;;;;;;;:::i;:::-;;;;;;;;;4889:41;4865:21;;:65;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;5028:88;5049:43;5094:21;;;;;;;;;;;5028:88;;;;;;;:::i;:::-;;;;;;;;4450:674::o:0;1831:101:0:-;1094:13;:11;:13::i;:::-;1895:30:::1;1922:1;1895:18;:30::i;:::-;1831:101::o:0;1201:85::-;1247:7;1273:6;;;;;;;;;;;1266:13;;1201:85;:::o;2306:129:2:-;2371:15;;:::i;:::-;2405:9;2415:11;2405:22;;;;;;;;:::i;:::-;;;;;;;;;;;;2398:29;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;2306:129;;;:::o;5927:610::-;1094:13:0;:11;:13::i;:::-;6104:35:2::1;6079:60;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:60;;;;;;;;:::i;:::-;;;6071:112;;;;;;;;;;;;:::i;:::-;;;;;;;;;6318:33;6294:21:::0;::::1;:57;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;6449:80;6470:35;6507:21;;;;;;;;;;;6449:80;;;;;;;:::i;:::-;;;;;;;;5927:610::o:0;2548:100::-;2601:4;2624:9;:16;;;;2617:23;;2548:100;:::o;2807:821::-;1094:13:0;:11;:13::i;:::-;3016:32:2::1;2991:57;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:57;;;;;;;;:::i;:::-;;;2983:106;;;;;;;;;;;;:::i;:::-;;;;;;;;;3234:6;3229:392;3250:7;:14;3246:1;:18;3229:392;;;3295:6;:18;3302:7;3310:1;3302:10;;;;;;;;:::i;:::-;;;;;;;;3295:18;;;;;;;;;;;;;;;:31;;;;;;;;;;;;3294:32;3286:70;;;;;;;;;;;;:::i;:::-;;;;;;;;;3470:4;3436:6;:18;3443:7;3451:1;3443:10;;;;;;;;:::i;:::-;;;;;;;;3436:18;;;;;;;;;;;;;;;:31;;;:38;;;;;;;;;;;;;;;;;;3582:27;3598:7;3606:1;3598:10;;;;;;;;:::i;:::-;;;;;;;;3582:27;;;;;;:::i;:::-;;;;;;;;3266:3;;;;;:::i;:::-;;;;3229:392;;;;2807:821:::0;:::o;3713:654::-;1094:13:0;:11;:13::i;:::-;3910:32:2::1;3885:57;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:57;;;;;;;;:::i;:::-;;;3877:119;;;;;;;;;;;;:::i;:::-;;;;;;;;;4141:43;4117:21;;:67;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;4282:77;4303:32;4337:21;;;;;;;;;;;4282:77;;;;;;;:::i;:::-;;;;;;;;3713:654::o:0;5207:639::-;1094:13:0;:11;:13::i;:::-;5399:41:2::1;5374:66;;;;;;;;:::i;:::-;;:21;;;;;;;;;;;:66;;;;;;;;:::i;:::-;;;5366:120;;;;;;;;;;;;:::i;:::-;;;;;;;;;5619:35;5595:21;;:59;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;5752:86;5773:41;5816:21;;;;;;;;;;;5752:86;;;;;;;:::i;:::-;;;;;;;;5207:639::o:0;2081:198:0:-;1094:13;:11;:13::i;:::-;2189:1:::1;2169:22;;:8;:22;;::::0;2161:73:::1;;;;;;;;;;;;:::i;:::-;;;;;;;;;2244:28;2263:8;2244:18;:28::i;:::-;2081:198:::0;:::o;2183:115:2:-;2235:14;2269:21;;;;;;;;;;;2262:28;;2183:115;:::o;9522:72::-;9561:4;9585:1;9578:8;;9522:72;:::o;1359:130:0:-;1433:12;:10;:12::i;:::-;1422:23;;:7;:5;:7::i;:::-;:23;;;1414:68;;;;;;;;;;;;:::i;:::-;;;;;;;;;1359:130::o;2433:187::-;2506:16;2525:6;;;;;;;;;;;2506:25;;2550:8;2541:6;;:17;;;;;;;;;;;;;;;;;;2604:8;2573:40;;2594:8;2573:40;;;;;;;;;;;;2496:124;2433:187;:::o;640:96:1:-;693:7;719:10;712:17;;640:96;:::o;-1:-1:-1:-;;;;;;;;;;;;;;;;;;;:::o;7:75:3:-;40:6;73:2;67:9;57:19;;7:75;:::o;88:117::-;197:1;194;187:12;211:117;320:1;317;310:12;334:77;371:7;400:5;389:16;;334:77;;;:::o;417:122::-;490:24;508:5;490:24;:::i;:::-;483:5;480:35;470:63;;529:1;526;519:12;470:63;417:122;:::o;545:139::-;591:5;629:6;616:20;607:29;;645:33;672:5;645:33;:::i;:::-;545:139;;;;:::o;690:329::-;749:6;798:2;786:9;777:7;773:23;769:32;766:119;;;804:79;;:::i;:::-;766:119;924:1;949:53;994:7;985:6;974:9;970:22;949:53;:::i;:::-;939:63;;895:117;690:329;;;;:::o;1025:117::-;1134:1;1131;1124:12;1148:117;1257:1;1254;1247:12;1271:102;1312:6;1363:2;1359:7;1354:2;1347:5;1343:14;1339:28;1329:38;;1271:102;;;:::o;1379:180::-;1427:77;1424:1;1417:88;1524:4;1521:1;1514:15;1548:4;1545:1;1538:15;1565:281;1648:27;1670:4;1648:27;:::i;:::-;1640:6;1636:40;1778:6;1766:10;1763:22;1742:18;1730:10;1727:34;1724:62;1721:88;;;1789:18;;:::i;:::-;1721:88;1829:10;1825:2;1818:22;1608:238;1565:281;;:::o;1852:129::-;1886:6;1913:20;;:::i;:::-;1903:30;;1942:33;1970:4;1962:6;1942:33;:::i;:::-;1852:129;;;:::o;1987:308::-;2049:4;2139:18;2131:6;2128:30;2125:56;;;2161:18;;:::i;:::-;2125:56;2199:29;2221:6;2199:29;:::i;:::-;2191:37;;2283:4;2277;2273:15;2265:23;;1987:308;;;:::o;2301:146::-;2398:6;2393:3;2388;2375:30;2439:1;2430:6;2425:3;2421:16;2414:27;2301:146;;;:::o;2453:425::-;2531:5;2556:66;2572:49;2614:6;2572:49;:::i;:::-;2556:66;:::i;:::-;2547:75;;2645:6;2638:5;2631:21;2683:4;2676:5;2672:16;2721:3;2712:6;2707:3;2703:16;2700:25;2697:112;;;2728:79;;:::i;:::-;2697:112;2818:54;2865:6;2860:3;2855;2818:54;:::i;:::-;2537:341;2453:425;;;;;:::o;2898:340::-;2954:5;3003:3;2996:4;2988:6;2984:17;2980:27;2970:122;;3011:79;;:::i;:::-;2970:122;3128:6;3115:20;3153:79;3228:3;3220:6;3213:4;3205:6;3201:17;3153:79;:::i;:::-;3144:88;;2960:278;2898:340;;;;:::o;3244:509::-;3313:6;3362:2;3350:9;3341:7;3337:23;3333:32;3330:119;;;3368:79;;:::i;:::-;3330:119;3516:1;3505:9;3501:17;3488:31;3546:18;3538:6;3535:30;3532:117;;;3568:79;;:::i;:::-;3532:117;3673:63;3728:7;3719:6;3708:9;3704:22;3673:63;:::i;:::-;3663:73;;3459:287;3244:509;;;;:::o;3759:126::-;3796:7;3836:42;3829:5;3825:54;3814:65;;3759:126;;;:::o;3891:96::-;3928:7;3957:24;3975:5;3957:24;:::i;:::-;3946:35;;3891:96;;;:::o;3993:118::-;4080:24;4098:5;4080:24;:::i;:::-;4075:3;4068:37;3993:118;;:::o;4117:222::-;4210:4;4248:2;4237:9;4233:18;4225:26;;4261:71;4329:1;4318:9;4314:17;4305:6;4261:71;:::i;:::-;4117:222;;;;:::o;4345:99::-;4397:6;4431:5;4425:12;4415:22;;4345:99;;;:::o;4450:159::-;4524:11;4558:6;4553:3;4546:19;4598:4;4593:3;4589:14;4574:29;;4450:159;;;;:::o;4615:246::-;4696:1;4706:113;4720:6;4717:1;4714:13;4706:113;;;4805:1;4800:3;4796:11;4790:18;4786:1;4781:3;4777:11;4770:39;4742:2;4739:1;4735:10;4730:15;;4706:113;;;4853:1;4844:6;4839:3;4835:16;4828:27;4677:184;4615:246;;;:::o;4867:357::-;4945:3;4973:39;5006:5;4973:39;:::i;:::-;5028:61;5082:6;5077:3;5028:61;:::i;:::-;5021:68;;5098:65;5156:6;5151:3;5144:4;5137:5;5133:16;5098:65;:::i;:::-;5188:29;5210:6;5188:29;:::i;:::-;5183:3;5179:39;5172:46;;4949:275;4867:357;;;;:::o;5230:108::-;5307:24;5325:5;5307:24;:::i;:::-;5302:3;5295:37;5230:108;;:::o;5400:618::-;5519:3;5555:4;5550:3;5546:14;5649:4;5642:5;5638:16;5632:23;5702:3;5696:4;5692:14;5685:4;5680:3;5676:14;5669:38;5728:73;5796:4;5782:12;5728:73;:::i;:::-;5720:81;;5570:242;5899:4;5892:5;5888:16;5882:23;5918:63;5975:4;5970:3;5966:14;5952:12;5918:63;:::i;:::-;5822:169;6008:4;6001:11;;5524:494;5400:618;;;;:::o;6024:373::-;6167:4;6205:2;6194:9;6190:18;6182:26;;6254:9;6248:4;6244:20;6240:1;6229:9;6225:17;6218:47;6282:108;6385:4;6376:6;6282:108;:::i;:::-;6274:116;;6024:373;;;;:::o;6403:118::-;6490:24;6508:5;6490:24;:::i;:::-;6485:3;6478:37;6403:118;;:::o;6527:222::-;6620:4;6658:2;6647:9;6643:18;6635:26;;6671:71;6739:1;6728:9;6724:17;6715:6;6671:71;:::i;:::-;6527:222;;;;:::o;6755:311::-;6832:4;6922:18;6914:6;6911:30;6908:56;;;6944:18;;:::i;:::-;6908:56;6994:4;6986:6;6982:17;6974:25;;7054:4;7048;7044:15;7036:23;;6755:311;;;:::o;7072:117::-;7181:1;7178;7171:12;7195:122;7268:24;7286:5;7268:24;:::i;:::-;7261:5;7258:35;7248:63;;7307:1;7304;7297:12;7248:63;7195:122;:::o;7323:139::-;7369:5;7407:6;7394:20;7385:29;;7423:33;7450:5;7423:33;:::i;:::-;7323:139;;;;:::o;7485:710::-;7581:5;7606:81;7622:64;7679:6;7622:64;:::i;:::-;7606:81;:::i;:::-;7597:90;;7707:5;7736:6;7729:5;7722:21;7770:4;7763:5;7759:16;7752:23;;7823:4;7815:6;7811:17;7803:6;7799:30;7852:3;7844:6;7841:15;7838:122;;;7871:79;;:::i;:::-;7838:122;7986:6;7969:220;8003:6;7998:3;7995:15;7969:220;;;8078:3;8107:37;8140:3;8128:10;8107:37;:::i;:::-;8102:3;8095:50;8174:4;8169:3;8165:14;8158:21;;8045:144;8029:4;8024:3;8020:14;8013:21;;7969:220;;;7973:21;7587:608;;7485:710;;;;;:::o;8218:370::-;8289:5;8338:3;8331:4;8323:6;8319:17;8315:27;8305:122;;8346:79;;:::i;:::-;8305:122;8463:6;8450:20;8488:94;8578:3;8570:6;8563:4;8555:6;8551:17;8488:94;:::i;:::-;8479:103;;8295:293;8218:370;;;;:::o;8594:539::-;8678:6;8727:2;8715:9;8706:7;8702:23;8698:32;8695:119;;;8733:79;;:::i;:::-;8695:119;8881:1;8870:9;8866:17;8853:31;8911:18;8903:6;8900:30;8897:117;;;8933:79;;:::i;:::-;8897:117;9038:78;9108:7;9099:6;9088:9;9084:22;9038:78;:::i;:::-;9028:88;;8824:302;8594:539;;;;:::o;9139:329::-;9198:6;9247:2;9235:9;9226:7;9222:23;9218:32;9215:119;;;9253:79;;:::i;:::-;9215:119;9373:1;9398:53;9443:7;9434:6;9423:9;9419:22;9398:53;:::i;:::-;9388:63;;9344:117;9139:329;;;;:::o;9474:180::-;9522:77;9519:1;9512:88;9619:4;9616:1;9609:15;9643:4;9640:1;9633:15;9660:123;9751:1;9744:5;9741:12;9731:46;;9757:18;;:::i;:::-;9731:46;9660:123;:::o;9789:147::-;9844:7;9873:5;9862:16;;9879:51;9924:5;9879:51;:::i;:::-;9789:147;;;:::o;9942:::-;10008:9;10041:42;10077:5;10041:42;:::i;:::-;10028:55;;9942:147;;;:::o;10095:163::-;10198:53;10245:5;10198:53;:::i;:::-;10193:3;10186:66;10095:163;;:::o;10264:254::-;10373:4;10411:2;10400:9;10396:18;10388:26;;10424:87;10508:1;10497:9;10493:17;10484:6;10424:87;:::i;:::-;10264:254;;;;:::o;10524:169::-;10608:11;10642:6;10637:3;10630:19;10682:4;10677:3;10673:14;10658:29;;10524:169;;;;:::o;10699:181::-;10839:33;10835:1;10827:6;10823:14;10816:57;10699:181;:::o;10886:366::-;11028:3;11049:67;11113:2;11108:3;11049:67;:::i;:::-;11042:74;;11125:93;11214:3;11125:93;:::i;:::-;11243:2;11238:3;11234:12;11227:19;;10886:366;;;:::o;11258:419::-;11424:4;11462:2;11451:9;11447:18;11439:26;;11511:9;11505:4;11501:20;11497:1;11486:9;11482:17;11475:47;11539:131;11665:4;11539:131;:::i;:::-;11531:139;;11258:419;;;:::o;11683:220::-;11823:34;11819:1;11811:6;11807:14;11800:58;11892:3;11887:2;11879:6;11875:15;11868:28;11683:220;:::o;11909:366::-;12051:3;12072:67;12136:2;12131:3;12072:67;:::i;:::-;12065:74;;12148:93;12237:3;12148:93;:::i;:::-;12266:2;12261:3;12257:12;12250:19;;11909:366;;;:::o;12281:419::-;12447:4;12485:2;12474:9;12470:18;12462:26;;12534:9;12528:4;12524:20;12520:1;12509:9;12505:17;12498:47;12562:131;12688:4;12562:131;:::i;:::-;12554:139;;12281:419;;;:::o;12706:173::-;12846:25;12842:1;12834:6;12830:14;12823:49;12706:173;:::o;12885:366::-;13027:3;13048:67;13112:2;13107:3;13048:67;:::i;:::-;13041:74;;13124:93;13213:3;13124:93;:::i;:::-;13242:2;13237:3;13233:12;13226:19;;12885:366;;;:::o;13257:419::-;13423:4;13461:2;13450:9;13446:18;13438:26;;13510:9;13504:4;13500:20;13496:1;13485:9;13481:17;13474:47;13538:131;13664:4;13538:131;:::i;:::-;13530:139;;13257:419;;;:::o;13682:180::-;13730:77;13727:1;13720:88;13827:4;13824:1;13817:15;13851:4;13848:1;13841:15;13868:180;13916:77;13913:1;13906:88;14013:4;14010:1;14003:15;14037:4;14034:1;14027:15;14054:233;14093:3;14116:24;14134:5;14116:24;:::i;:::-;14107:33;;14162:66;14155:5;14152:77;14149:103;;14232:18;;:::i;:::-;14149:103;14279:1;14272:5;14268:13;14261:20;;14054:233;;;:::o;14293:332::-;14414:4;14452:2;14441:9;14437:18;14429:26;;14465:71;14533:1;14522:9;14518:17;14509:6;14465:71;:::i;:::-;14546:72;14614:2;14603:9;14599:18;14590:6;14546:72;:::i;:::-;14293:332;;;;;:::o;14631:224::-;14771:34;14767:1;14759:6;14755:14;14748:58;14840:7;14835:2;14827:6;14823:15;14816:32;14631:224;:::o;14861:366::-;15003:3;15024:67;15088:2;15083:3;15024:67;:::i;:::-;15017:74;;15100:93;15189:3;15100:93;:::i;:::-;15218:2;15213:3;15209:12;15202:19;;14861:366;;;:::o;15233:419::-;15399:4;15437:2;15426:9;15422:18;15414:26;;15486:9;15480:4;15476:20;15472:1;15461:9;15457:17;15450:47;15514:131;15640:4;15514:131;:::i;:::-;15506:139;;15233:419;;;:::o;15658:148::-;15760:11;15797:3;15782:18;;15658:148;;;;:::o;15812:390::-;15918:3;15946:39;15979:5;15946:39;:::i;:::-;16001:89;16083:6;16078:3;16001:89;:::i;:::-;15994:96;;16099:65;16157:6;16152:3;16145:4;16138:5;16134:16;16099:65;:::i;:::-;16189:6;16184:3;16180:16;16173:23;;15922:280;15812:390;;;;:::o;16208:275::-;16340:3;16362:95;16453:3;16444:6;16362:95;:::i;:::-;16355:102;;16474:3;16467:10;;16208:275;;;;:::o;16489:172::-;16629:24;16625:1;16617:6;16613:14;16606:48;16489:172;:::o;16667:366::-;16809:3;16830:67;16894:2;16889:3;16830:67;:::i;:::-;16823:74;;16906:93;16995:3;16906:93;:::i;:::-;17024:2;17019:3;17015:12;17008:19;;16667:366;;;:::o;17039:419::-;17205:4;17243:2;17232:9;17228:18;17220:26;;17292:9;17286:4;17282:20;17278:1;17267:9;17263:17;17256:47;17320:131;17446:4;17320:131;:::i;:::-;17312:139;;17039:419;;;:::o;17464:180::-;17512:77;17509:1;17502:88;17609:4;17606:1;17599:15;17633:4;17630:1;17623:15;17650:320;17694:6;17731:1;17725:4;17721:12;17711:22;;17778:1;17772:4;17768:12;17799:18;17789:81;;17855:4;17847:6;17843:17;17833:27;;17789:81;17917:2;17909:6;17906:14;17886:18;17883:38;17880:84;;17936:18;;:::i;:::-;17880:84;17701:269;17650:320;;;:::o;17976:141::-;18025:4;18048:3;18040:11;;18071:3;18068:1;18061:14;18105:4;18102:1;18092:18;18084:26;;17976:141;;;:::o;18147:874::-;18250:3;18287:5;18281:12;18316:36;18342:9;18316:36;:::i;:::-;18368:89;18450:6;18445:3;18368:89;:::i;:::-;18361:96;;18488:1;18477:9;18473:17;18504:1;18499:166;;;;18679:1;18674:341;;;;18466:549;;18499:166;18583:4;18579:9;18568;18564:25;18559:3;18552:38;18645:6;18638:14;18631:22;18623:6;18619:35;18614:3;18610:45;18603:52;;18499:166;;18674:341;18741:38;18773:5;18741:38;:::i;:::-;18801:1;18815:154;18829:6;18826:1;18823:13;18815:154;;;18903:7;18897:14;18893:1;18888:3;18884:11;18877:35;18953:1;18944:7;18940:15;18929:26;;18851:4;18848:1;18844:12;18839:17;;18815:154;;;18998:6;18993:3;18989:16;18982:23;;18681:334;;18466:549;;18254:767;;18147:874;;;;:::o;19027:269::-;19156:3;19178:92;19266:3;19257:6;19178:92;:::i;:::-;19171:99;;19287:3;19280:10;;19027:269;;;;:::o;19302:178::-;19442:30;19438:1;19430:6;19426:14;19419:54;19302:178;:::o;19486:366::-;19628:3;19649:67;19713:2;19708:3;19649:67;:::i;:::-;19642:74;;19725:93;19814:3;19725:93;:::i;:::-;19843:2;19838:3;19834:12;19827:19;;19486:366;;;:::o;19858:419::-;20024:4;20062:2;20051:9;20047:18;20039:26;;20111:9;20105:4;20101:20;20097:1;20086:9;20082:17;20075:47;20139:131;20265:4;20139:131;:::i;:::-;20131:139;;19858:419;;;:::o;20283:93::-;20320:6;20367:2;20362;20355:5;20351:14;20347:23;20337:33;;20283:93;;;:::o;20382:107::-;20426:8;20476:5;20470:4;20466:16;20445:37;;20382:107;;;;:::o;20495:393::-;20564:6;20614:1;20602:10;20598:18;20637:97;20667:66;20656:9;20637:97;:::i;:::-;20755:39;20785:8;20774:9;20755:39;:::i;:::-;20743:51;;20827:4;20823:9;20816:5;20812:21;20803:30;;20876:4;20866:8;20862:19;20855:5;20852:30;20842:40;;20571:317;;20495:393;;;;;:::o;20894:60::-;20922:3;20943:5;20936:12;;20894:60;;;:::o;20960:142::-;21010:9;21043:53;21061:34;21070:24;21088:5;21070:24;:::i;:::-;21061:34;:::i;:::-;21043:53;:::i;:::-;21030:66;;20960:142;;;:::o;21108:75::-;21151:3;21172:5;21165:12;;21108:75;;;:::o;21189:269::-;21299:39;21330:7;21299:39;:::i;:::-;21360:91;21409:41;21433:16;21409:41;:::i;:::-;21401:6;21394:4;21388:11;21360:91;:::i;:::-;21354:4;21347:105;21265:193;21189:269;;;:::o;21464:73::-;21509:3;21464:73;:::o;21543:189::-;21620:32;;:::i;:::-;21661:65;21719:6;21711;21705:4;21661:65;:::i;:::-;21596:136;21543:189;;:::o;21738:186::-;21798:120;21815:3;21808:5;21805:14;21798:120;;;21869:39;21906:1;21899:5;21869:39;:::i;:::-;21842:1;21835:5;21831:13;21822:22;;21798:120;;;21738:186;;:::o;21930:543::-;22031:2;22026:3;22023:11;22020:446;;;22065:38;22097:5;22065:38;:::i;:::-;22149:29;22167:10;22149:29;:::i;:::-;22139:8;22135:44;22332:2;22320:10;22317:18;22314:49;;;22353:8;22338:23;;22314:49;22376:80;22432:22;22450:3;22432:22;:::i;:::-;22422:8;22418:37;22405:11;22376:80;:::i;:::-;22035:431;;22020:446;21930:543;;;:::o;22479:117::-;22533:8;22583:5;22577:4;22573:16;22552:37;;22479:117;;;;:::o;22602:169::-;22646:6;22679:51;22727:1;22723:6;22715:5;22712:1;22708:13;22679:51;:::i;:::-;22675:56;22760:4;22754;22750:15;22740:25;;22653:118;22602:169;;;;:::o;22776:295::-;22852:4;22998:29;23023:3;23017:4;22998:29;:::i;:::-;22990:37;;23060:3;23057:1;23053:11;23047:4;23044:21;23036:29;;22776:295;;;;:::o;23076:1395::-;23193:37;23226:3;23193:37;:::i;:::-;23295:18;23287:6;23284:30;23281:56;;;23317:18;;:::i;:::-;23281:56;23361:38;23393:4;23387:11;23361:38;:::i;:::-;23446:67;23506:6;23498;23492:4;23446:67;:::i;:::-;23540:1;23564:4;23551:17;;23596:2;23588:6;23585:14;23613:1;23608:618;;;;24270:1;24287:6;24284:77;;;24336:9;24331:3;24327:19;24321:26;24312:35;;24284:77;24387:67;24447:6;24440:5;24387:67;:::i;:::-;24381:4;24374:81;24243:222;23578:887;;23608:618;23660:4;23656:9;23648:6;23644:22;23694:37;23726:4;23694:37;:::i;:::-;23753:1;23767:208;23781:7;23778:1;23775:14;23767:208;;;23860:9;23855:3;23851:19;23845:26;23837:6;23830:42;23911:1;23903:6;23899:14;23889:24;;23958:2;23947:9;23943:18;23930:31;;23804:4;23801:1;23797:12;23792:17;;23767:208;;;24003:6;23994:7;23991:19;23988:179;;;24061:9;24056:3;24052:19;24046:26;24104:48;24146:4;24138:6;24134:17;24123:9;24104:48;:::i;:::-;24096:6;24089:64;24011:156;23988:179;24213:1;24209;24201:6;24197:14;24193:22;24187:4;24180:36;23615:611;;;23578:887;;23168:1303;;;23076:1395;;:::o;24477:194::-;24517:4;24537:20;24555:1;24537:20;:::i;:::-;24532:25;;24571:20;24589:1;24571:20;:::i;:::-;24566:25;;24615:1;24612;24608:9;24600:17;;24639:1;24633:4;24630:11;24627:37;;;24644:18;;:::i;:::-;24627:37;24477:194;;;;:::o;24677:222::-;24817:34;24813:1;24805:6;24801:14;24794:58;24886:5;24881:2;24873:6;24869:15;24862:30;24677:222;:::o;24905:366::-;25047:3;25068:67;25132:2;25127:3;25068:67;:::i;:::-;25061:74;;25144:93;25233:3;25144:93;:::i;:::-;25262:2;25257:3;25253:12;25246:19;;24905:366;;;:::o;25277:419::-;25443:4;25481:2;25470:9;25466:18;25458:26;;25530:9;25524:4;25520:20;25516:1;25505:9;25501:17;25494:47;25558:131;25684:4;25558:131;:::i;:::-;25550:139;;25277:419;;;:::o;25702:234::-;25842:34;25838:1;25830:6;25826:14;25819:58;25911:17;25906:2;25898:6;25894:15;25887:42;25702:234;:::o;25942:366::-;26084:3;26105:67;26169:2;26164:3;26105:67;:::i;:::-;26098:74;;26181:93;26270:3;26181:93;:::i;:::-;26299:2;26294:3;26290:12;26283:19;;25942:366;;;:::o;26314:419::-;26480:4;26518:2;26507:9;26503:18;26495:26;;26567:9;26561:4;26557:20;26553:1;26542:9;26538:17;26531:47;26595:131;26721:4;26595:131;:::i;:::-;26587:139;;26314:419;;;:::o;26739:396::-;26892:4;26930:2;26919:9;26915:18;26907:26;;26943:87;27027:1;27016:9;27012:17;27003:6;26943:87;:::i;:::-;27040:88;27124:2;27113:9;27109:18;27100:6;27040:88;:::i;:::-;26739:396;;;;;:::o;27141:226::-;27281:34;27277:1;27269:6;27265:14;27258:58;27350:9;27345:2;27337:6;27333:15;27326:34;27141:226;:::o;27373:366::-;27515:3;27536:67;27600:2;27595:3;27536:67;:::i;:::-;27529:74;;27612:93;27701:3;27612:93;:::i;:::-;27730:2;27725:3;27721:12;27714:19;;27373:366;;;:::o;27745:419::-;27911:4;27949:2;27938:9;27934:18;27926:26;;27998:9;27992:4;27988:20;27984:1;27973:9;27969:17;27962:47;28026:131;28152:4;28026:131;:::i;:::-;28018:139;;27745:419;;;:::o;28170:223::-;28310:34;28306:1;28298:6;28294:14;28287:58;28379:6;28374:2;28366:6;28362:15;28355:31;28170:223;:::o;28399:366::-;28541:3;28562:67;28626:2;28621:3;28562:67;:::i;:::-;28555:74;;28638:93;28727:3;28638:93;:::i;:::-;28756:2;28751:3;28747:12;28740:19;;28399:366;;;:::o;28771:419::-;28937:4;28975:2;28964:9;28960:18;28952:26;;29024:9;29018:4;29014:20;29010:1;28999:9;28995:17;28988:47;29052:131;29178:4;29052:131;:::i;:::-;29044:139;;28771:419;;;:::o;29196:175::-;29336:27;29332:1;29324:6;29320:14;29313:51;29196:175;:::o;29377:366::-;29519:3;29540:67;29604:2;29599:3;29540:67;:::i;:::-;29533:74;;29616:93;29705:3;29616:93;:::i;:::-;29734:2;29729:3;29725:12;29718:19;;29377:366;;;:::o;29749:419::-;29915:4;29953:2;29942:9;29938:18;29930:26;;30002:9;29996:4;29992:20;29988:1;29977:9;29973:17;29966:47;30030:131;30156:4;30030:131;:::i;:::-;30022:139;;29749:419;;;:::o;30174:236::-;30314:34;30310:1;30302:6;30298:14;30291:58;30383:19;30378:2;30370:6;30366:15;30359:44;30174:236;:::o;30416:366::-;30558:3;30579:67;30643:2;30638:3;30579:67;:::i;:::-;30572:74;;30655:93;30744:3;30655:93;:::i;:::-;30773:2;30768:3;30764:12;30757:19;;30416:366;;;:::o;30788:419::-;30954:4;30992:2;30981:9;30977:18;30969:26;;31041:9;31035:4;31031:20;31027:1;31016:9;31012:17;31005:47;31069:131;31195:4;31069:131;:::i;:::-;31061:139;;30788:419;;;:::o;31213:228::-;31353:34;31349:1;31341:6;31337:14;31330:58;31422:11;31417:2;31409:6;31405:15;31398:36;31213:228;:::o;31447:366::-;31589:3;31610:67;31674:2;31669:3;31610:67;:::i;:::-;31603:74;;31686:93;31775:3;31686:93;:::i;:::-;31804:2;31799:3;31795:12;31788:19;;31447:366;;;:::o;31819:419::-;31985:4;32023:2;32012:9;32008:18;32000:26;;32072:9;32066:4;32062:20;32058:1;32047:9;32043:17;32036:47;32100:131;32226:4;32100:131;:::i;:::-;32092:139;;31819:419;;;:::o;32244:225::-;32384:34;32380:1;32372:6;32368:14;32361:58;32453:8;32448:2;32440:6;32436:15;32429:33;32244:225;:::o;32475:366::-;32617:3;32638:67;32702:2;32697:3;32638:67;:::i;:::-;32631:74;;32714:93;32803:3;32714:93;:::i;:::-;32832:2;32827:3;32823:12;32816:19;;32475:366;;;:::o;32847:419::-;33013:4;33051:2;33040:9;33036:18;33028:26;;33100:9;33094:4;33090:20;33086:1;33075:9;33071:17;33064:47;33128:131;33254:4;33128:131;:::i;:::-;33120:139;;32847:419;;;:::o;33272:182::-;33412:34;33408:1;33400:6;33396:14;33389:58;33272:182;:::o;33460:366::-;33602:3;33623:67;33687:2;33682:3;33623:67;:::i;:::-;33616:74;;33699:93;33788:3;33699:93;:::i;:::-;33817:2;33812:3;33808:12;33801:19;;33460:366;;;:::o;33832:419::-;33998:4;34036:2;34025:9;34021:18;34013:26;;34085:9;34079:4;34075:20;34071:1;34060:9;34056:17;34049:47;34113:131;34239:4;34113:131;:::i;:::-;34105:139;;33832:419;;;:::o";
    var source = "// SPDX-License-Identifier: GPL-3.0\r\npragma solidity ^0.8.4;\r\n\r\nimport \"@openzeppelin/contracts/access/Ownable.sol\";\r\n\r\n/// @title A voting system\r\n/// @author Wsh on est vraiment 8 ? / Modified by Nathan\r\n/// @notice This system permit users to make proposals and vote them\r\ncontract Voting is Ownable {\r\n\r\n    // Structures de données\r\n\r\n    struct Voter {\r\n        bool isRegistered;\r\n        bool hasVoted;\r\n        uint votedProposalId;\r\n    }\r\n\r\n    struct Proposal {\r\n        string description;\r\n        uint voteCount;\r\n    }\r\n\r\n    // Énumération des états du processus de vote\r\n\r\n    enum WorkflowStatus {\r\n        RegisteringVoters,\r\n        ProposalsRegistrationStarted,\r\n        ProposalsRegistrationEnded,\r\n        VotingSessionStarted,\r\n        VotingSessionEnded,\r\n        VotesTallied\r\n    }\r\n\r\n    uint winningProposalId;\r\n\r\n    // Événements\r\n\r\n    event VoterRegistered(address voterAddress);\r\n    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);\r\n    event ProposalRegistered(uint proposalId);\r\n    event Voted (address voter, uint proposalId);\r\n\r\n    // Variables d'état\r\n\r\n    mapping(address => Voter) voters;\r\n    Proposal[] proposals;\r\n    WorkflowStatus currentWorkflowStatus;\r\n\r\n    // Modificateurs\r\n\r\n    modifier onlyVoters() {\r\n        require(voters[msg.sender].isRegistered, \"You are not registered to vote.\");\r\n        _;\r\n    }\r\n\r\n    modifier onlyDuringVotingSession() {\r\n        require(currentWorkflowStatus == WorkflowStatus.VotingSessionStarted, \"The voting session is not active.\");\r\n        _;\r\n    }\r\n\r\n    modifier onlyAfterVotingSessionEnded() {\r\n        require(currentWorkflowStatus == WorkflowStatus.VotingSessionEnded, \"The voting session is still active.\");\r\n        _;\r\n    }\r\n\r\n    modifier onlyDuringProposalsRegistration() {\r\n        require(currentWorkflowStatus == WorkflowStatus.ProposalsRegistrationStarted, \"Proposals registration is not active.\");\r\n        _;\r\n    }\r\n\r\n    modifier onlyAfterProposalsRegistrationEnded() {\r\n        require(currentWorkflowStatus == WorkflowStatus.ProposalsRegistrationEnded, \"Proposals registration is still active.\");\r\n        _;\r\n    }\r\n\r\n    function getWorkflowStatus() external view returns (WorkflowStatus) {\r\n        return currentWorkflowStatus;\r\n    }\r\n\r\n    function getOneProposal(uint _proposalId) external view returns (Proposal memory){\r\n        return proposals[_proposalId];\r\n    }\r\n\r\n    /// @notice Get proposal array length to get array in front\r\n    /// @custom:accessibility External\r\n    function getProposalsLength() external view returns (uint){\r\n        return proposals.length;\r\n    }\r\n\r\n    // Fonctions d'administration\r\n\r\n    /// @notice Register voters\r\n    /// @param _voters : Address of voters\r\n    /// @custom:accessibility Admin\r\n    function registerVoters(address[] memory _voters) external onlyOwner {\r\n        // Vérifie que l'état courant du workflow est en cours d'inscription des électeurs.\r\n        require(currentWorkflowStatus == WorkflowStatus.RegisteringVoters, \"Cannot register voters at this time.\");\r\n        // Boucle sur la liste des adresses d'électeurs fournie et vérifie que chaque électeur n'est pas déjà enregistré.\r\n        for (uint i = 0; i < _voters.length; i++) {\r\n            require(!voters[_voters[i]].isRegistered, \"Voter already registered.\");\r\n            // Enregistre l'électeur comme étant enregistré.\r\n            voters[_voters[i]].isRegistered = true;\r\n            // Émet un événement pour signaler que l'électeur a été enregistré.\r\n            emit VoterRegistered(_voters[i]);\r\n        }\r\n    }\r\n\r\n    /// @notice Start proposal session\r\n    /// @custom:accessibility Admin\r\n    function startProposalsRegistration() external onlyOwner {\r\n        // Vérifie que l'état courant du workflow est en cours d'inscription des électeurs.\r\n        require(currentWorkflowStatus == WorkflowStatus.RegisteringVoters, \"Cannot start proposals registration at this time.\");\r\n        // Modifie l'état courant du workflow pour indiquer que l'inscription des propositions a commencé.\r\n        currentWorkflowStatus = WorkflowStatus.ProposalsRegistrationStarted;\r\n        // Émet un événement pour signaler que l'état du workflow a changé.\r\n        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, currentWorkflowStatus);\r\n    }\r\n\r\n    /// @notice End proposal session\r\n    /// @custom:accessibility Admin\r\n    function endProposalsRegistration() external onlyOwner {\r\n        // Vérifie que l'état courant du workflow est en cours d'inscription des propositions.\r\n        require(currentWorkflowStatus == WorkflowStatus.ProposalsRegistrationStarted, \"Cannot end proposals registration at this time.\");\r\n        // Modifie l'état courant du workflow pour indiquer que l'inscription des propositions est terminée.\r\n        currentWorkflowStatus = WorkflowStatus.ProposalsRegistrationEnded;\r\n        // Émet un événement pour signaler que l'état du workflow a changé.\r\n        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, currentWorkflowStatus);\r\n    }\r\n\r\n    /// @notice Start voting session\r\n    /// @custom:accessibility Admin\r\n    function startVotingSession() external onlyOwner {\r\n        // Vérifie que l'état courant du workflow est l'inscription des propositions terminée.\r\n        require(currentWorkflowStatus == WorkflowStatus.ProposalsRegistrationEnded, \"Cannot start voting session at this time.\");\r\n        // Modifie l'état courant du workflow pour indiquer que la session de vote a commencé.\r\n        currentWorkflowStatus = WorkflowStatus.VotingSessionStarted;\r\n        // Émet un événement pour signaler que l'état du workflow a changé.\r\n        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, currentWorkflowStatus);\r\n    }\r\n\r\n    /// @notice End voting session\r\n    /// @custom:accessibility Admin\r\n    function endVotingSession() external onlyOwner {\r\n        // Vérifie que l'état courant du workflow est la session de vote en cours.\r\n        require(currentWorkflowStatus == WorkflowStatus.VotingSessionStarted, \"Cannot end voting session at this time.\");\r\n        // Modifie l'état courant du workflow pour indiquer que la session de vote est terminée.\r\n        currentWorkflowStatus = WorkflowStatus.VotingSessionEnded;\r\n        // Émet un événement pour signaler que l'état du workflow a changé.\r\n        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, currentWorkflowStatus);\r\n    }\r\n\r\n    /// @notice For users to register proposal\r\n    /// @param _description : Description of their proposal\r\n    /// @custom:accessibility Voters\r\n    function registerProposal(string memory _description) external onlyVoters onlyDuringProposalsRegistration {\r\n        // La fonction permet à un électeur enregistré de proposer une nouvelle proposition pendant la période d'enregistrement des propositions.\r\n        require(keccak256(abi.encodePacked(_description)) != keccak256(\"\"), \"Proposal can't be null\");\r\n        for (uint i = 0; i < proposals.length; i++) {\r\n            require(keccak256(abi.encodePacked(proposals[i].description)) != keccak256(abi.encodePacked(_description)), \"Proposal already registered.\");\r\n            proposals.push(Proposal({\r\n                description: _description,\r\n                voteCount: 0\r\n            }));\r\n            // Ajouter une nouvelle proposition à la liste des propositions existantes et émettre un événement.\r\n            emit ProposalRegistered(proposals.length - 1);\r\n        }\r\n    }\r\n\r\n    /// @notice For users to vote\r\n    /// @param _proposalId : Id of proposal\r\n    /// @custom:accessibility Voters\r\n    function vote(uint _proposalId) external onlyVoters onlyDuringVotingSession {\r\n        // Récupère le votant actuel depuis le mapping de votants\r\n        Voter storage voter = voters[msg.sender];\r\n        // Vérifie si le votant n'a pas déjà voté\r\n        require(!voter.hasVoted, \"You have already voted.\");\r\n        // Enregistre le vote et le votant dans les mappings correspondants\r\n        voter.hasVoted = true;\r\n        voter.votedProposalId = _proposalId;\r\n        // Incrémente le compteur de votes pour la proposition correspondante\r\n        proposals[_proposalId].voteCount++;\r\n        // Émet un événement pour signaler que le votant a voté pour la proposition correspondante\r\n        emit Voted(msg.sender, _proposalId);\r\n    }\r\n\r\n    /// @notice Tally votes after ending voting session\r\n    /// @custom:accessibility Admin\r\n    function tallyVotes() external onlyOwner onlyAfterVotingSessionEnded {\r\n        // Initialise le compteur de votes gagnants à zéro et l'indice de la proposition gagnante à zéro\r\n        uint winningVoteCount = 0;\r\n        uint winningProposalIndex = 0;\r\n        // Parcourt toutes les propositions enregistrées\r\n        for (uint i = 0; i < proposals.length; i++) {\r\n            // Si le nombre de votes pour la proposition actuelle est supérieur au nombre de votes gagnants, alors la proposition actuelle devient la proposition gagnante\r\n            if (proposals[i].voteCount > winningVoteCount) {\r\n                winningVoteCount = proposals[i].voteCount;\r\n                winningProposalIndex = i;\r\n            }\r\n        }\r\n        // Enregistre l'ID de la proposition gagnante et met à jour le statut de workflow\r\n        winningProposalId = winningProposalIndex;\r\n        currentWorkflowStatus = WorkflowStatus.VotesTallied;\r\n    }\r\n\r\n    function test() external pure returns (uint) {\r\n        return 1;\r\n    }\r\n\r\n}\r\n";
    var sourcePath = "C:\\Users\\Nathan\\IdeaProjects\\blockchain-vote-svelte\\back\\contracts\\Voting.sol";
    var ast = {
    	absolutePath: "project:/contracts/Voting.sol",
    	exportedSymbols: {
    		Context: [
    			134
    		],
    		Ownable: [
    			112
    		],
    		Voting: [
    			640
    		]
    	},
    	id: 641,
    	license: "GPL-3.0",
    	nodeType: "SourceUnit",
    	nodes: [
    		{
    			id: 136,
    			literals: [
    				"solidity",
    				"^",
    				"0.8",
    				".4"
    			],
    			nodeType: "PragmaDirective",
    			src: "37:23:2"
    		},
    		{
    			absolutePath: "@openzeppelin/contracts/access/Ownable.sol",
    			file: "@openzeppelin/contracts/access/Ownable.sol",
    			id: 137,
    			nameLocation: "-1:-1:-1",
    			nodeType: "ImportDirective",
    			scope: 641,
    			sourceUnit: 113,
    			src: "64:52:2",
    			symbolAliases: [
    			],
    			unitAlias: ""
    		},
    		{
    			abstract: false,
    			baseContracts: [
    				{
    					baseName: {
    						id: 139,
    						name: "Ownable",
    						nameLocations: [
    							"295:7:2"
    						],
    						nodeType: "IdentifierPath",
    						referencedDeclaration: 112,
    						src: "295:7:2"
    					},
    					id: 140,
    					nodeType: "InheritanceSpecifier",
    					src: "295:7:2"
    				}
    			],
    			canonicalName: "Voting",
    			contractDependencies: [
    			],
    			contractKind: "contract",
    			documentation: {
    				id: 138,
    				nodeType: "StructuredDocumentation",
    				src: "120:156:2",
    				text: "@title A voting system\n @author Wsh on est vraiment 8 ? / Modified by Nathan\n @notice This system permit users to make proposals and vote them"
    			},
    			fullyImplemented: true,
    			id: 640,
    			linearizedBaseContracts: [
    				640,
    				112,
    				134
    			],
    			name: "Voting",
    			nameLocation: "285:6:2",
    			nodeType: "ContractDefinition",
    			nodes: [
    				{
    					canonicalName: "Voting.Voter",
    					id: 147,
    					members: [
    						{
    							constant: false,
    							id: 142,
    							mutability: "mutable",
    							name: "isRegistered",
    							nameLocation: "374:12:2",
    							nodeType: "VariableDeclaration",
    							scope: 147,
    							src: "369:17:2",
    							stateVariable: false,
    							storageLocation: "default",
    							typeDescriptions: {
    								typeIdentifier: "t_bool",
    								typeString: "bool"
    							},
    							typeName: {
    								id: 141,
    								name: "bool",
    								nodeType: "ElementaryTypeName",
    								src: "369:4:2",
    								typeDescriptions: {
    									typeIdentifier: "t_bool",
    									typeString: "bool"
    								}
    							},
    							visibility: "internal"
    						},
    						{
    							constant: false,
    							id: 144,
    							mutability: "mutable",
    							name: "hasVoted",
    							nameLocation: "402:8:2",
    							nodeType: "VariableDeclaration",
    							scope: 147,
    							src: "397:13:2",
    							stateVariable: false,
    							storageLocation: "default",
    							typeDescriptions: {
    								typeIdentifier: "t_bool",
    								typeString: "bool"
    							},
    							typeName: {
    								id: 143,
    								name: "bool",
    								nodeType: "ElementaryTypeName",
    								src: "397:4:2",
    								typeDescriptions: {
    									typeIdentifier: "t_bool",
    									typeString: "bool"
    								}
    							},
    							visibility: "internal"
    						},
    						{
    							constant: false,
    							id: 146,
    							mutability: "mutable",
    							name: "votedProposalId",
    							nameLocation: "426:15:2",
    							nodeType: "VariableDeclaration",
    							scope: 147,
    							src: "421:20:2",
    							stateVariable: false,
    							storageLocation: "default",
    							typeDescriptions: {
    								typeIdentifier: "t_uint256",
    								typeString: "uint256"
    							},
    							typeName: {
    								id: 145,
    								name: "uint",
    								nodeType: "ElementaryTypeName",
    								src: "421:4:2",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								}
    							},
    							visibility: "internal"
    						}
    					],
    					name: "Voter",
    					nameLocation: "352:5:2",
    					nodeType: "StructDefinition",
    					scope: 640,
    					src: "345:104:2",
    					visibility: "public"
    				},
    				{
    					canonicalName: "Voting.Proposal",
    					id: 152,
    					members: [
    						{
    							constant: false,
    							id: 149,
    							mutability: "mutable",
    							name: "description",
    							nameLocation: "491:11:2",
    							nodeType: "VariableDeclaration",
    							scope: 152,
    							src: "484:18:2",
    							stateVariable: false,
    							storageLocation: "default",
    							typeDescriptions: {
    								typeIdentifier: "t_string_storage_ptr",
    								typeString: "string"
    							},
    							typeName: {
    								id: 148,
    								name: "string",
    								nodeType: "ElementaryTypeName",
    								src: "484:6:2",
    								typeDescriptions: {
    									typeIdentifier: "t_string_storage_ptr",
    									typeString: "string"
    								}
    							},
    							visibility: "internal"
    						},
    						{
    							constant: false,
    							id: 151,
    							mutability: "mutable",
    							name: "voteCount",
    							nameLocation: "518:9:2",
    							nodeType: "VariableDeclaration",
    							scope: 152,
    							src: "513:14:2",
    							stateVariable: false,
    							storageLocation: "default",
    							typeDescriptions: {
    								typeIdentifier: "t_uint256",
    								typeString: "uint256"
    							},
    							typeName: {
    								id: 150,
    								name: "uint",
    								nodeType: "ElementaryTypeName",
    								src: "513:4:2",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								}
    							},
    							visibility: "internal"
    						}
    					],
    					name: "Proposal",
    					nameLocation: "464:8:2",
    					nodeType: "StructDefinition",
    					scope: 640,
    					src: "457:78:2",
    					visibility: "public"
    				},
    				{
    					canonicalName: "Voting.WorkflowStatus",
    					id: 159,
    					members: [
    						{
    							id: 153,
    							name: "RegisteringVoters",
    							nameLocation: "630:17:2",
    							nodeType: "EnumValue",
    							src: "630:17:2"
    						},
    						{
    							id: 154,
    							name: "ProposalsRegistrationStarted",
    							nameLocation: "658:28:2",
    							nodeType: "EnumValue",
    							src: "658:28:2"
    						},
    						{
    							id: 155,
    							name: "ProposalsRegistrationEnded",
    							nameLocation: "697:26:2",
    							nodeType: "EnumValue",
    							src: "697:26:2"
    						},
    						{
    							id: 156,
    							name: "VotingSessionStarted",
    							nameLocation: "734:20:2",
    							nodeType: "EnumValue",
    							src: "734:20:2"
    						},
    						{
    							id: 157,
    							name: "VotingSessionEnded",
    							nameLocation: "765:18:2",
    							nodeType: "EnumValue",
    							src: "765:18:2"
    						},
    						{
    							id: 158,
    							name: "VotesTallied",
    							nameLocation: "794:12:2",
    							nodeType: "EnumValue",
    							src: "794:12:2"
    						}
    					],
    					name: "WorkflowStatus",
    					nameLocation: "604:14:2",
    					nodeType: "EnumDefinition",
    					src: "599:214:2"
    				},
    				{
    					constant: false,
    					id: 161,
    					mutability: "mutable",
    					name: "winningProposalId",
    					nameLocation: "826:17:2",
    					nodeType: "VariableDeclaration",
    					scope: 640,
    					src: "821:22:2",
    					stateVariable: true,
    					storageLocation: "default",
    					typeDescriptions: {
    						typeIdentifier: "t_uint256",
    						typeString: "uint256"
    					},
    					typeName: {
    						id: 160,
    						name: "uint",
    						nodeType: "ElementaryTypeName",
    						src: "821:4:2",
    						typeDescriptions: {
    							typeIdentifier: "t_uint256",
    							typeString: "uint256"
    						}
    					},
    					visibility: "internal"
    				},
    				{
    					anonymous: false,
    					eventSelector: "b6be2187d059cc2a55fe29e0e503b566e1e0f8c8780096e185429350acffd3dd",
    					id: 165,
    					name: "VoterRegistered",
    					nameLocation: "881:15:2",
    					nodeType: "EventDefinition",
    					parameters: {
    						id: 164,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 163,
    								indexed: false,
    								mutability: "mutable",
    								name: "voterAddress",
    								nameLocation: "905:12:2",
    								nodeType: "VariableDeclaration",
    								scope: 165,
    								src: "897:20:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_address",
    									typeString: "address"
    								},
    								typeName: {
    									id: 162,
    									name: "address",
    									nodeType: "ElementaryTypeName",
    									src: "897:7:2",
    									stateMutability: "nonpayable",
    									typeDescriptions: {
    										typeIdentifier: "t_address",
    										typeString: "address"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "896:22:2"
    					},
    					src: "875:44:2"
    				},
    				{
    					anonymous: false,
    					eventSelector: "0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f",
    					id: 173,
    					name: "WorkflowStatusChange",
    					nameLocation: "931:20:2",
    					nodeType: "EventDefinition",
    					parameters: {
    						id: 172,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 168,
    								indexed: false,
    								mutability: "mutable",
    								name: "previousStatus",
    								nameLocation: "967:14:2",
    								nodeType: "VariableDeclaration",
    								scope: 173,
    								src: "952:29:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_enum$_WorkflowStatus_$159",
    									typeString: "enum Voting.WorkflowStatus"
    								},
    								typeName: {
    									id: 167,
    									nodeType: "UserDefinedTypeName",
    									pathNode: {
    										id: 166,
    										name: "WorkflowStatus",
    										nameLocations: [
    											"952:14:2"
    										],
    										nodeType: "IdentifierPath",
    										referencedDeclaration: 159,
    										src: "952:14:2"
    									},
    									referencedDeclaration: 159,
    									src: "952:14:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								visibility: "internal"
    							},
    							{
    								constant: false,
    								id: 171,
    								indexed: false,
    								mutability: "mutable",
    								name: "newStatus",
    								nameLocation: "998:9:2",
    								nodeType: "VariableDeclaration",
    								scope: 173,
    								src: "983:24:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_enum$_WorkflowStatus_$159",
    									typeString: "enum Voting.WorkflowStatus"
    								},
    								typeName: {
    									id: 170,
    									nodeType: "UserDefinedTypeName",
    									pathNode: {
    										id: 169,
    										name: "WorkflowStatus",
    										nameLocations: [
    											"983:14:2"
    										],
    										nodeType: "IdentifierPath",
    										referencedDeclaration: 159,
    										src: "983:14:2"
    									},
    									referencedDeclaration: 159,
    									src: "983:14:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "951:57:2"
    					},
    					src: "925:84:2"
    				},
    				{
    					anonymous: false,
    					eventSelector: "92e393e9b54e2f801d3ea4beb0c5e71a21cc34a5d34b77d0fb8a3aa1650dc18f",
    					id: 177,
    					name: "ProposalRegistered",
    					nameLocation: "1021:18:2",
    					nodeType: "EventDefinition",
    					parameters: {
    						id: 176,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 175,
    								indexed: false,
    								mutability: "mutable",
    								name: "proposalId",
    								nameLocation: "1045:10:2",
    								nodeType: "VariableDeclaration",
    								scope: 177,
    								src: "1040:15:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 174,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "1040:4:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "1039:17:2"
    					},
    					src: "1015:42:2"
    				},
    				{
    					anonymous: false,
    					eventSelector: "4d99b957a2bc29a30ebd96a7be8e68fe50a3c701db28a91436490b7d53870ca4",
    					id: 183,
    					name: "Voted",
    					nameLocation: "1069:5:2",
    					nodeType: "EventDefinition",
    					parameters: {
    						id: 182,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 179,
    								indexed: false,
    								mutability: "mutable",
    								name: "voter",
    								nameLocation: "1084:5:2",
    								nodeType: "VariableDeclaration",
    								scope: 183,
    								src: "1076:13:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_address",
    									typeString: "address"
    								},
    								typeName: {
    									id: 178,
    									name: "address",
    									nodeType: "ElementaryTypeName",
    									src: "1076:7:2",
    									stateMutability: "nonpayable",
    									typeDescriptions: {
    										typeIdentifier: "t_address",
    										typeString: "address"
    									}
    								},
    								visibility: "internal"
    							},
    							{
    								constant: false,
    								id: 181,
    								indexed: false,
    								mutability: "mutable",
    								name: "proposalId",
    								nameLocation: "1096:10:2",
    								nodeType: "VariableDeclaration",
    								scope: 183,
    								src: "1091:15:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 180,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "1091:4:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "1075:32:2"
    					},
    					src: "1063:45:2"
    				},
    				{
    					constant: false,
    					id: 188,
    					mutability: "mutable",
    					name: "voters",
    					nameLocation: "1170:6:2",
    					nodeType: "VariableDeclaration",
    					scope: 640,
    					src: "1144:32:2",
    					stateVariable: true,
    					storageLocation: "default",
    					typeDescriptions: {
    						typeIdentifier: "t_mapping$_t_address_$_t_struct$_Voter_$147_storage_$",
    						typeString: "mapping(address => struct Voting.Voter)"
    					},
    					typeName: {
    						id: 187,
    						keyName: "",
    						keyNameLocation: "-1:-1:-1",
    						keyType: {
    							id: 184,
    							name: "address",
    							nodeType: "ElementaryTypeName",
    							src: "1152:7:2",
    							typeDescriptions: {
    								typeIdentifier: "t_address",
    								typeString: "address"
    							}
    						},
    						nodeType: "Mapping",
    						src: "1144:25:2",
    						typeDescriptions: {
    							typeIdentifier: "t_mapping$_t_address_$_t_struct$_Voter_$147_storage_$",
    							typeString: "mapping(address => struct Voting.Voter)"
    						},
    						valueName: "",
    						valueNameLocation: "-1:-1:-1",
    						valueType: {
    							id: 186,
    							nodeType: "UserDefinedTypeName",
    							pathNode: {
    								id: 185,
    								name: "Voter",
    								nameLocations: [
    									"1163:5:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 147,
    								src: "1163:5:2"
    							},
    							referencedDeclaration: 147,
    							src: "1163:5:2",
    							typeDescriptions: {
    								typeIdentifier: "t_struct$_Voter_$147_storage_ptr",
    								typeString: "struct Voting.Voter"
    							}
    						}
    					},
    					visibility: "internal"
    				},
    				{
    					constant: false,
    					id: 192,
    					mutability: "mutable",
    					name: "proposals",
    					nameLocation: "1194:9:2",
    					nodeType: "VariableDeclaration",
    					scope: 640,
    					src: "1183:20:2",
    					stateVariable: true,
    					storageLocation: "default",
    					typeDescriptions: {
    						typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    						typeString: "struct Voting.Proposal[]"
    					},
    					typeName: {
    						baseType: {
    							id: 190,
    							nodeType: "UserDefinedTypeName",
    							pathNode: {
    								id: 189,
    								name: "Proposal",
    								nameLocations: [
    									"1183:8:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 152,
    								src: "1183:8:2"
    							},
    							referencedDeclaration: 152,
    							src: "1183:8:2",
    							typeDescriptions: {
    								typeIdentifier: "t_struct$_Proposal_$152_storage_ptr",
    								typeString: "struct Voting.Proposal"
    							}
    						},
    						id: 191,
    						nodeType: "ArrayTypeName",
    						src: "1183:10:2",
    						typeDescriptions: {
    							typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage_ptr",
    							typeString: "struct Voting.Proposal[]"
    						}
    					},
    					visibility: "internal"
    				},
    				{
    					constant: false,
    					id: 195,
    					mutability: "mutable",
    					name: "currentWorkflowStatus",
    					nameLocation: "1225:21:2",
    					nodeType: "VariableDeclaration",
    					scope: 640,
    					src: "1210:36:2",
    					stateVariable: true,
    					storageLocation: "default",
    					typeDescriptions: {
    						typeIdentifier: "t_enum$_WorkflowStatus_$159",
    						typeString: "enum Voting.WorkflowStatus"
    					},
    					typeName: {
    						id: 194,
    						nodeType: "UserDefinedTypeName",
    						pathNode: {
    							id: 193,
    							name: "WorkflowStatus",
    							nameLocations: [
    								"1210:14:2"
    							],
    							nodeType: "IdentifierPath",
    							referencedDeclaration: 159,
    							src: "1210:14:2"
    						},
    						referencedDeclaration: 159,
    						src: "1210:14:2",
    						typeDescriptions: {
    							typeIdentifier: "t_enum$_WorkflowStatus_$159",
    							typeString: "enum Voting.WorkflowStatus"
    						}
    					},
    					visibility: "internal"
    				},
    				{
    					body: {
    						id: 207,
    						nodeType: "Block",
    						src: "1301:106:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											expression: {
    												baseExpression: {
    													id: 198,
    													name: "voters",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 188,
    													src: "1320:6:2",
    													typeDescriptions: {
    														typeIdentifier: "t_mapping$_t_address_$_t_struct$_Voter_$147_storage_$",
    														typeString: "mapping(address => struct Voting.Voter storage ref)"
    													}
    												},
    												id: 201,
    												indexExpression: {
    													expression: {
    														id: 199,
    														name: "msg",
    														nodeType: "Identifier",
    														overloadedDeclarations: [
    														],
    														referencedDeclaration: 4294967281,
    														src: "1327:3:2",
    														typeDescriptions: {
    															typeIdentifier: "t_magic_message",
    															typeString: "msg"
    														}
    													},
    													id: 200,
    													isConstant: false,
    													isLValue: false,
    													isPure: false,
    													lValueRequested: false,
    													memberLocation: "1331:6:2",
    													memberName: "sender",
    													nodeType: "MemberAccess",
    													src: "1327:10:2",
    													typeDescriptions: {
    														typeIdentifier: "t_address",
    														typeString: "address"
    													}
    												},
    												isConstant: false,
    												isLValue: true,
    												isPure: false,
    												lValueRequested: false,
    												nodeType: "IndexAccess",
    												src: "1320:18:2",
    												typeDescriptions: {
    													typeIdentifier: "t_struct$_Voter_$147_storage",
    													typeString: "struct Voting.Voter storage ref"
    												}
    											},
    											id: 202,
    											isConstant: false,
    											isLValue: true,
    											isPure: false,
    											lValueRequested: false,
    											memberLocation: "1339:12:2",
    											memberName: "isRegistered",
    											nodeType: "MemberAccess",
    											referencedDeclaration: 142,
    											src: "1320:31:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "596f7520617265206e6f74207265676973746572656420746f20766f74652e",
    											id: 203,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "1353:33:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473",
    												typeString: "literal_string \"You are not registered to vote.\""
    											},
    											value: "You are not registered to vote."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_57d3589d93850f3cbf9658f8cf7d55be2e67fc493077202d86b3d3bae774a473",
    												typeString: "literal_string \"You are not registered to vote.\""
    											}
    										],
    										id: 197,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "1312:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 204,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "1312:75:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 205,
    								nodeType: "ExpressionStatement",
    								src: "1312:75:2"
    							},
    							{
    								id: 206,
    								nodeType: "PlaceholderStatement",
    								src: "1398:1:2"
    							}
    						]
    					},
    					id: 208,
    					name: "onlyVoters",
    					nameLocation: "1288:10:2",
    					nodeType: "ModifierDefinition",
    					parameters: {
    						id: 196,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "1298:2:2"
    					},
    					src: "1279:128:2",
    					virtual: false,
    					visibility: "internal"
    				},
    				{
    					body: {
    						id: 219,
    						nodeType: "Block",
    						src: "1450:137:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 214,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 211,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "1469:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 212,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "1494:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 213,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "1509:20:2",
    												memberName: "VotingSessionStarted",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 156,
    												src: "1494:35:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "1469:60:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "54686520766f74696e672073657373696f6e206973206e6f74206163746976652e",
    											id: 215,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "1531:35:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018",
    												typeString: "literal_string \"The voting session is not active.\""
    											},
    											value: "The voting session is not active."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_2b0d477275ba5410cc88953a276c38fc0b68a764c315a994ccac9836e4fb3018",
    												typeString: "literal_string \"The voting session is not active.\""
    											}
    										],
    										id: 210,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "1461:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 216,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "1461:106:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 217,
    								nodeType: "ExpressionStatement",
    								src: "1461:106:2"
    							},
    							{
    								id: 218,
    								nodeType: "PlaceholderStatement",
    								src: "1578:1:2"
    							}
    						]
    					},
    					id: 220,
    					name: "onlyDuringVotingSession",
    					nameLocation: "1424:23:2",
    					nodeType: "ModifierDefinition",
    					parameters: {
    						id: 209,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "1447:2:2"
    					},
    					src: "1415:172:2",
    					virtual: false,
    					visibility: "internal"
    				},
    				{
    					body: {
    						id: 231,
    						nodeType: "Block",
    						src: "1634:137:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 226,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 223,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "1653:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 224,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "1678:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 225,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "1693:18:2",
    												memberName: "VotingSessionEnded",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 157,
    												src: "1678:33:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "1653:58:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "54686520766f74696e672073657373696f6e206973207374696c6c206163746976652e",
    											id: 227,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "1713:37:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105",
    												typeString: "literal_string \"The voting session is still active.\""
    											},
    											value: "The voting session is still active."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_4f8b92e55cbd10dc46f764534378b168f74482a660a5f3225c75ca400dc9e105",
    												typeString: "literal_string \"The voting session is still active.\""
    											}
    										],
    										id: 222,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "1645:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 228,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "1645:106:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 229,
    								nodeType: "ExpressionStatement",
    								src: "1645:106:2"
    							},
    							{
    								id: 230,
    								nodeType: "PlaceholderStatement",
    								src: "1762:1:2"
    							}
    						]
    					},
    					id: 232,
    					name: "onlyAfterVotingSessionEnded",
    					nameLocation: "1604:27:2",
    					nodeType: "ModifierDefinition",
    					parameters: {
    						id: 221,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "1631:2:2"
    					},
    					src: "1595:176:2",
    					virtual: false,
    					visibility: "internal"
    				},
    				{
    					body: {
    						id: 243,
    						nodeType: "Block",
    						src: "1822:149:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 238,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 235,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "1841:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 236,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "1866:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 237,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "1881:28:2",
    												memberName: "ProposalsRegistrationStarted",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 154,
    												src: "1866:43:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "1841:68:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "50726f706f73616c7320726567697374726174696f6e206973206e6f74206163746976652e",
    											id: 239,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "1911:39:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943",
    												typeString: "literal_string \"Proposals registration is not active.\""
    											},
    											value: "Proposals registration is not active."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_7db539739560cc3090d5c9134c7ade7512e79ccf4268e5211e9490a78428b943",
    												typeString: "literal_string \"Proposals registration is not active.\""
    											}
    										],
    										id: 234,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "1833:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 240,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "1833:118:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 241,
    								nodeType: "ExpressionStatement",
    								src: "1833:118:2"
    							},
    							{
    								id: 242,
    								nodeType: "PlaceholderStatement",
    								src: "1962:1:2"
    							}
    						]
    					},
    					id: 244,
    					name: "onlyDuringProposalsRegistration",
    					nameLocation: "1788:31:2",
    					nodeType: "ModifierDefinition",
    					parameters: {
    						id: 233,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "1819:2:2"
    					},
    					src: "1779:192:2",
    					virtual: false,
    					visibility: "internal"
    				},
    				{
    					body: {
    						id: 255,
    						nodeType: "Block",
    						src: "2026:149:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 250,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 247,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "2045:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 248,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "2070:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 249,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "2085:26:2",
    												memberName: "ProposalsRegistrationEnded",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 155,
    												src: "2070:41:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "2045:66:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "50726f706f73616c7320726567697374726174696f6e206973207374696c6c206163746976652e",
    											id: 251,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "2113:41:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_8e7e27fe3cb0cf01a3be661d9a366afb680250427e861380aa5599b9a8a41bba",
    												typeString: "literal_string \"Proposals registration is still active.\""
    											},
    											value: "Proposals registration is still active."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_8e7e27fe3cb0cf01a3be661d9a366afb680250427e861380aa5599b9a8a41bba",
    												typeString: "literal_string \"Proposals registration is still active.\""
    											}
    										],
    										id: 246,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "2037:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 252,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "2037:118:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 253,
    								nodeType: "ExpressionStatement",
    								src: "2037:118:2"
    							},
    							{
    								id: 254,
    								nodeType: "PlaceholderStatement",
    								src: "2166:1:2"
    							}
    						]
    					},
    					id: 256,
    					name: "onlyAfterProposalsRegistrationEnded",
    					nameLocation: "1988:35:2",
    					nodeType: "ModifierDefinition",
    					parameters: {
    						id: 245,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "2023:2:2"
    					},
    					src: "1979:196:2",
    					virtual: false,
    					visibility: "internal"
    				},
    				{
    					body: {
    						id: 264,
    						nodeType: "Block",
    						src: "2251:47:2",
    						statements: [
    							{
    								expression: {
    									id: 262,
    									name: "currentWorkflowStatus",
    									nodeType: "Identifier",
    									overloadedDeclarations: [
    									],
    									referencedDeclaration: 195,
    									src: "2269:21:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								functionReturnParameters: 261,
    								id: 263,
    								nodeType: "Return",
    								src: "2262:28:2"
    							}
    						]
    					},
    					functionSelector: "f75d64a6",
    					id: 265,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    					],
    					name: "getWorkflowStatus",
    					nameLocation: "2192:17:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 257,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "2209:2:2"
    					},
    					returnParameters: {
    						id: 261,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 260,
    								mutability: "mutable",
    								name: "",
    								nameLocation: "-1:-1:-1",
    								nodeType: "VariableDeclaration",
    								scope: 265,
    								src: "2235:14:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_enum$_WorkflowStatus_$159",
    									typeString: "enum Voting.WorkflowStatus"
    								},
    								typeName: {
    									id: 259,
    									nodeType: "UserDefinedTypeName",
    									pathNode: {
    										id: 258,
    										name: "WorkflowStatus",
    										nameLocations: [
    											"2235:14:2"
    										],
    										nodeType: "IdentifierPath",
    										referencedDeclaration: 159,
    										src: "2235:14:2"
    									},
    									referencedDeclaration: 159,
    									src: "2235:14:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "2234:16:2"
    					},
    					scope: 640,
    					src: "2183:115:2",
    					stateMutability: "view",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 277,
    						nodeType: "Block",
    						src: "2387:48:2",
    						statements: [
    							{
    								expression: {
    									baseExpression: {
    										id: 273,
    										name: "proposals",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 192,
    										src: "2405:9:2",
    										typeDescriptions: {
    											typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    											typeString: "struct Voting.Proposal storage ref[] storage ref"
    										}
    									},
    									id: 275,
    									indexExpression: {
    										id: 274,
    										name: "_proposalId",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 267,
    										src: "2415:11:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									isConstant: false,
    									isLValue: true,
    									isPure: false,
    									lValueRequested: false,
    									nodeType: "IndexAccess",
    									src: "2405:22:2",
    									typeDescriptions: {
    										typeIdentifier: "t_struct$_Proposal_$152_storage",
    										typeString: "struct Voting.Proposal storage ref"
    									}
    								},
    								functionReturnParameters: 272,
    								id: 276,
    								nodeType: "Return",
    								src: "2398:29:2"
    							}
    						]
    					},
    					functionSelector: "a2788cce",
    					id: 278,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    					],
    					name: "getOneProposal",
    					nameLocation: "2315:14:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 268,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 267,
    								mutability: "mutable",
    								name: "_proposalId",
    								nameLocation: "2335:11:2",
    								nodeType: "VariableDeclaration",
    								scope: 278,
    								src: "2330:16:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 266,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "2330:4:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "2329:18:2"
    					},
    					returnParameters: {
    						id: 272,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 271,
    								mutability: "mutable",
    								name: "",
    								nameLocation: "-1:-1:-1",
    								nodeType: "VariableDeclaration",
    								scope: 278,
    								src: "2371:15:2",
    								stateVariable: false,
    								storageLocation: "memory",
    								typeDescriptions: {
    									typeIdentifier: "t_struct$_Proposal_$152_memory_ptr",
    									typeString: "struct Voting.Proposal"
    								},
    								typeName: {
    									id: 270,
    									nodeType: "UserDefinedTypeName",
    									pathNode: {
    										id: 269,
    										name: "Proposal",
    										nameLocations: [
    											"2371:8:2"
    										],
    										nodeType: "IdentifierPath",
    										referencedDeclaration: 152,
    										src: "2371:8:2"
    									},
    									referencedDeclaration: 152,
    									src: "2371:8:2",
    									typeDescriptions: {
    										typeIdentifier: "t_struct$_Proposal_$152_storage_ptr",
    										typeString: "struct Voting.Proposal"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "2370:17:2"
    					},
    					scope: 640,
    					src: "2306:129:2",
    					stateMutability: "view",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 287,
    						nodeType: "Block",
    						src: "2606:42:2",
    						statements: [
    							{
    								expression: {
    									expression: {
    										id: 284,
    										name: "proposals",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 192,
    										src: "2624:9:2",
    										typeDescriptions: {
    											typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    											typeString: "struct Voting.Proposal storage ref[] storage ref"
    										}
    									},
    									id: 285,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									memberLocation: "2634:6:2",
    									memberName: "length",
    									nodeType: "MemberAccess",
    									src: "2624:16:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								functionReturnParameters: 283,
    								id: 286,
    								nodeType: "Return",
    								src: "2617:23:2"
    							}
    						]
    					},
    					documentation: {
    						id: 279,
    						nodeType: "StructuredDocumentation",
    						src: "2443:99:2",
    						text: "@notice Get proposal array length to get array in front\n @custom:accessibility External"
    					},
    					functionSelector: "bc378a73",
    					id: 288,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    					],
    					name: "getProposalsLength",
    					nameLocation: "2557:18:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 280,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "2575:2:2"
    					},
    					returnParameters: {
    						id: 283,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 282,
    								mutability: "mutable",
    								name: "",
    								nameLocation: "-1:-1:-1",
    								nodeType: "VariableDeclaration",
    								scope: 288,
    								src: "2601:4:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 281,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "2601:4:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "2600:6:2"
    					},
    					scope: 640,
    					src: "2548:100:2",
    					stateMutability: "view",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 344,
    						nodeType: "Block",
    						src: "2876:752:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 301,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 298,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "2991:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 299,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "3016:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 300,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "3031:17:2",
    												memberName: "RegisteringVoters",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 153,
    												src: "3016:32:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "2991:57:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "43616e6e6f7420726567697374657220766f7465727320617420746869732074696d652e",
    											id: 302,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "3050:38:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da",
    												typeString: "literal_string \"Cannot register voters at this time.\""
    											},
    											value: "Cannot register voters at this time."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_5fec131d04129fa23956602132f18da4b11f0f99c99b3bc3932e10835a0cd0da",
    												typeString: "literal_string \"Cannot register voters at this time.\""
    											}
    										],
    										id: 297,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "2983:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 303,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "2983:106:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 304,
    								nodeType: "ExpressionStatement",
    								src: "2983:106:2"
    							},
    							{
    								body: {
    									id: 342,
    									nodeType: "Block",
    									src: "3271:350:2",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    													{
    														id: 323,
    														isConstant: false,
    														isLValue: false,
    														isPure: false,
    														lValueRequested: false,
    														nodeType: "UnaryOperation",
    														operator: "!",
    														prefix: true,
    														src: "3294:32:2",
    														subExpression: {
    															expression: {
    																baseExpression: {
    																	id: 317,
    																	name: "voters",
    																	nodeType: "Identifier",
    																	overloadedDeclarations: [
    																	],
    																	referencedDeclaration: 188,
    																	src: "3295:6:2",
    																	typeDescriptions: {
    																		typeIdentifier: "t_mapping$_t_address_$_t_struct$_Voter_$147_storage_$",
    																		typeString: "mapping(address => struct Voting.Voter storage ref)"
    																	}
    																},
    																id: 321,
    																indexExpression: {
    																	baseExpression: {
    																		id: 318,
    																		name: "_voters",
    																		nodeType: "Identifier",
    																		overloadedDeclarations: [
    																		],
    																		referencedDeclaration: 292,
    																		src: "3302:7:2",
    																		typeDescriptions: {
    																			typeIdentifier: "t_array$_t_address_$dyn_memory_ptr",
    																			typeString: "address[] memory"
    																		}
    																	},
    																	id: 320,
    																	indexExpression: {
    																		id: 319,
    																		name: "i",
    																		nodeType: "Identifier",
    																		overloadedDeclarations: [
    																		],
    																		referencedDeclaration: 306,
    																		src: "3310:1:2",
    																		typeDescriptions: {
    																			typeIdentifier: "t_uint256",
    																			typeString: "uint256"
    																		}
    																	},
    																	isConstant: false,
    																	isLValue: true,
    																	isPure: false,
    																	lValueRequested: false,
    																	nodeType: "IndexAccess",
    																	src: "3302:10:2",
    																	typeDescriptions: {
    																		typeIdentifier: "t_address",
    																		typeString: "address"
    																	}
    																},
    																isConstant: false,
    																isLValue: true,
    																isPure: false,
    																lValueRequested: false,
    																nodeType: "IndexAccess",
    																src: "3295:18:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_struct$_Voter_$147_storage",
    																	typeString: "struct Voting.Voter storage ref"
    																}
    															},
    															id: 322,
    															isConstant: false,
    															isLValue: true,
    															isPure: false,
    															lValueRequested: false,
    															memberLocation: "3314:12:2",
    															memberName: "isRegistered",
    															nodeType: "MemberAccess",
    															referencedDeclaration: 142,
    															src: "3295:31:2",
    															typeDescriptions: {
    																typeIdentifier: "t_bool",
    																typeString: "bool"
    															}
    														},
    														typeDescriptions: {
    															typeIdentifier: "t_bool",
    															typeString: "bool"
    														}
    													},
    													{
    														hexValue: "566f74657220616c726561647920726567697374657265642e",
    														id: 324,
    														isConstant: false,
    														isLValue: false,
    														isPure: true,
    														kind: "string",
    														lValueRequested: false,
    														nodeType: "Literal",
    														src: "3328:27:2",
    														typeDescriptions: {
    															typeIdentifier: "t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c",
    															typeString: "literal_string \"Voter already registered.\""
    														},
    														value: "Voter already registered."
    													}
    												],
    												expression: {
    													argumentTypes: [
    														{
    															typeIdentifier: "t_bool",
    															typeString: "bool"
    														},
    														{
    															typeIdentifier: "t_stringliteral_2dec434e65e07c500a6f602c22443135b41ed88b8555ad1a06c0774a6639c39c",
    															typeString: "literal_string \"Voter already registered.\""
    														}
    													],
    													id: 316,
    													name: "require",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    														4294967278,
    														4294967278
    													],
    													referencedDeclaration: 4294967278,
    													src: "3286:7:2",
    													typeDescriptions: {
    														typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    														typeString: "function (bool,string memory) pure"
    													}
    												},
    												id: 325,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												kind: "functionCall",
    												lValueRequested: false,
    												nameLocations: [
    												],
    												names: [
    												],
    												nodeType: "FunctionCall",
    												src: "3286:70:2",
    												tryCall: false,
    												typeDescriptions: {
    													typeIdentifier: "t_tuple$__$",
    													typeString: "tuple()"
    												}
    											},
    											id: 326,
    											nodeType: "ExpressionStatement",
    											src: "3286:70:2"
    										},
    										{
    											expression: {
    												id: 334,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												lValueRequested: false,
    												leftHandSide: {
    													expression: {
    														baseExpression: {
    															id: 327,
    															name: "voters",
    															nodeType: "Identifier",
    															overloadedDeclarations: [
    															],
    															referencedDeclaration: 188,
    															src: "3436:6:2",
    															typeDescriptions: {
    																typeIdentifier: "t_mapping$_t_address_$_t_struct$_Voter_$147_storage_$",
    																typeString: "mapping(address => struct Voting.Voter storage ref)"
    															}
    														},
    														id: 331,
    														indexExpression: {
    															baseExpression: {
    																id: 328,
    																name: "_voters",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 292,
    																src: "3443:7:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_array$_t_address_$dyn_memory_ptr",
    																	typeString: "address[] memory"
    																}
    															},
    															id: 330,
    															indexExpression: {
    																id: 329,
    																name: "i",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 306,
    																src: "3451:1:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_uint256",
    																	typeString: "uint256"
    																}
    															},
    															isConstant: false,
    															isLValue: true,
    															isPure: false,
    															lValueRequested: false,
    															nodeType: "IndexAccess",
    															src: "3443:10:2",
    															typeDescriptions: {
    																typeIdentifier: "t_address",
    																typeString: "address"
    															}
    														},
    														isConstant: false,
    														isLValue: true,
    														isPure: false,
    														lValueRequested: false,
    														nodeType: "IndexAccess",
    														src: "3436:18:2",
    														typeDescriptions: {
    															typeIdentifier: "t_struct$_Voter_$147_storage",
    															typeString: "struct Voting.Voter storage ref"
    														}
    													},
    													id: 332,
    													isConstant: false,
    													isLValue: true,
    													isPure: false,
    													lValueRequested: true,
    													memberLocation: "3455:12:2",
    													memberName: "isRegistered",
    													nodeType: "MemberAccess",
    													referencedDeclaration: 142,
    													src: "3436:31:2",
    													typeDescriptions: {
    														typeIdentifier: "t_bool",
    														typeString: "bool"
    													}
    												},
    												nodeType: "Assignment",
    												operator: "=",
    												rightHandSide: {
    													hexValue: "74727565",
    													id: 333,
    													isConstant: false,
    													isLValue: false,
    													isPure: true,
    													kind: "bool",
    													lValueRequested: false,
    													nodeType: "Literal",
    													src: "3470:4:2",
    													typeDescriptions: {
    														typeIdentifier: "t_bool",
    														typeString: "bool"
    													},
    													value: "true"
    												},
    												src: "3436:38:2",
    												typeDescriptions: {
    													typeIdentifier: "t_bool",
    													typeString: "bool"
    												}
    											},
    											id: 335,
    											nodeType: "ExpressionStatement",
    											src: "3436:38:2"
    										},
    										{
    											eventCall: {
    												"arguments": [
    													{
    														baseExpression: {
    															id: 337,
    															name: "_voters",
    															nodeType: "Identifier",
    															overloadedDeclarations: [
    															],
    															referencedDeclaration: 292,
    															src: "3598:7:2",
    															typeDescriptions: {
    																typeIdentifier: "t_array$_t_address_$dyn_memory_ptr",
    																typeString: "address[] memory"
    															}
    														},
    														id: 339,
    														indexExpression: {
    															id: 338,
    															name: "i",
    															nodeType: "Identifier",
    															overloadedDeclarations: [
    															],
    															referencedDeclaration: 306,
    															src: "3606:1:2",
    															typeDescriptions: {
    																typeIdentifier: "t_uint256",
    																typeString: "uint256"
    															}
    														},
    														isConstant: false,
    														isLValue: true,
    														isPure: false,
    														lValueRequested: false,
    														nodeType: "IndexAccess",
    														src: "3598:10:2",
    														typeDescriptions: {
    															typeIdentifier: "t_address",
    															typeString: "address"
    														}
    													}
    												],
    												expression: {
    													argumentTypes: [
    														{
    															typeIdentifier: "t_address",
    															typeString: "address"
    														}
    													],
    													id: 336,
    													name: "VoterRegistered",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 165,
    													src: "3582:15:2",
    													typeDescriptions: {
    														typeIdentifier: "t_function_event_nonpayable$_t_address_$returns$__$",
    														typeString: "function (address)"
    													}
    												},
    												id: 340,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												kind: "functionCall",
    												lValueRequested: false,
    												nameLocations: [
    												],
    												names: [
    												],
    												nodeType: "FunctionCall",
    												src: "3582:27:2",
    												tryCall: false,
    												typeDescriptions: {
    													typeIdentifier: "t_tuple$__$",
    													typeString: "tuple()"
    												}
    											},
    											id: 341,
    											nodeType: "EmitStatement",
    											src: "3577:32:2"
    										}
    									]
    								},
    								condition: {
    									commonType: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									},
    									id: 312,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftExpression: {
    										id: 309,
    										name: "i",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 306,
    										src: "3246:1:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									nodeType: "BinaryOperation",
    									operator: "<",
    									rightExpression: {
    										expression: {
    											id: 310,
    											name: "_voters",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 292,
    											src: "3250:7:2",
    											typeDescriptions: {
    												typeIdentifier: "t_array$_t_address_$dyn_memory_ptr",
    												typeString: "address[] memory"
    											}
    										},
    										id: 311,
    										isConstant: false,
    										isLValue: false,
    										isPure: false,
    										lValueRequested: false,
    										memberLocation: "3258:6:2",
    										memberName: "length",
    										nodeType: "MemberAccess",
    										src: "3250:14:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									src: "3246:18:2",
    									typeDescriptions: {
    										typeIdentifier: "t_bool",
    										typeString: "bool"
    									}
    								},
    								id: 343,
    								initializationExpression: {
    									assignments: [
    										306
    									],
    									declarations: [
    										{
    											constant: false,
    											id: 306,
    											mutability: "mutable",
    											name: "i",
    											nameLocation: "3239:1:2",
    											nodeType: "VariableDeclaration",
    											scope: 343,
    											src: "3234:6:2",
    											stateVariable: false,
    											storageLocation: "default",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											},
    											typeName: {
    												id: 305,
    												name: "uint",
    												nodeType: "ElementaryTypeName",
    												src: "3234:4:2",
    												typeDescriptions: {
    													typeIdentifier: "t_uint256",
    													typeString: "uint256"
    												}
    											},
    											visibility: "internal"
    										}
    									],
    									id: 308,
    									initialValue: {
    										hexValue: "30",
    										id: 307,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										kind: "number",
    										lValueRequested: false,
    										nodeType: "Literal",
    										src: "3243:1:2",
    										typeDescriptions: {
    											typeIdentifier: "t_rational_0_by_1",
    											typeString: "int_const 0"
    										},
    										value: "0"
    									},
    									nodeType: "VariableDeclarationStatement",
    									src: "3234:10:2"
    								},
    								loopExpression: {
    									expression: {
    										id: 314,
    										isConstant: false,
    										isLValue: false,
    										isPure: false,
    										lValueRequested: false,
    										nodeType: "UnaryOperation",
    										operator: "++",
    										prefix: false,
    										src: "3266:3:2",
    										subExpression: {
    											id: 313,
    											name: "i",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 306,
    											src: "3266:1:2",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											}
    										},
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									id: 315,
    									nodeType: "ExpressionStatement",
    									src: "3266:3:2"
    								},
    								nodeType: "ForStatement",
    								src: "3229:392:2"
    							}
    						]
    					},
    					documentation: {
    						id: 289,
    						nodeType: "StructuredDocumentation",
    						src: "2693:108:2",
    						text: "@notice Register voters\n @param _voters : Address of voters\n @custom:accessibility Admin"
    					},
    					functionSelector: "d55ec9c1",
    					id: 345,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 295,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 294,
    								name: "onlyOwner",
    								nameLocations: [
    									"2866:9:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 31,
    								src: "2866:9:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "2866:9:2"
    						}
    					],
    					name: "registerVoters",
    					nameLocation: "2816:14:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 293,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 292,
    								mutability: "mutable",
    								name: "_voters",
    								nameLocation: "2848:7:2",
    								nodeType: "VariableDeclaration",
    								scope: 345,
    								src: "2831:24:2",
    								stateVariable: false,
    								storageLocation: "memory",
    								typeDescriptions: {
    									typeIdentifier: "t_array$_t_address_$dyn_memory_ptr",
    									typeString: "address[]"
    								},
    								typeName: {
    									baseType: {
    										id: 290,
    										name: "address",
    										nodeType: "ElementaryTypeName",
    										src: "2831:7:2",
    										stateMutability: "nonpayable",
    										typeDescriptions: {
    											typeIdentifier: "t_address",
    											typeString: "address"
    										}
    									},
    									id: 291,
    									nodeType: "ArrayTypeName",
    									src: "2831:9:2",
    									typeDescriptions: {
    										typeIdentifier: "t_array$_t_address_$dyn_storage_ptr",
    										typeString: "address[]"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "2830:26:2"
    					},
    					returnParameters: {
    						id: 296,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "2876:0:2"
    					},
    					scope: 640,
    					src: "2807:821:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 370,
    						nodeType: "Block",
    						src: "3770:597:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 355,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 352,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "3885:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 353,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "3910:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 354,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "3925:17:2",
    												memberName: "RegisteringVoters",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 153,
    												src: "3910:32:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "3885:57:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "43616e6e6f742073746172742070726f706f73616c7320726567697374726174696f6e20617420746869732074696d652e",
    											id: 356,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "3944:51:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de",
    												typeString: "literal_string \"Cannot start proposals registration at this time.\""
    											},
    											value: "Cannot start proposals registration at this time."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_0dd45ec0d73c749edc68b2a69a0dfdebd769dfae188a607b811c0b89ff5c75de",
    												typeString: "literal_string \"Cannot start proposals registration at this time.\""
    											}
    										],
    										id: 351,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "3877:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 357,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "3877:119:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 358,
    								nodeType: "ExpressionStatement",
    								src: "3877:119:2"
    							},
    							{
    								expression: {
    									id: 362,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										id: 359,
    										name: "currentWorkflowStatus",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 195,
    										src: "4117:21:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										expression: {
    											id: 360,
    											name: "WorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 159,
    											src: "4141:14:2",
    											typeDescriptions: {
    												typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    												typeString: "type(enum Voting.WorkflowStatus)"
    											}
    										},
    										id: 361,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										lValueRequested: false,
    										memberLocation: "4156:28:2",
    										memberName: "ProposalsRegistrationStarted",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 154,
    										src: "4141:43:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									src: "4117:67:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								id: 363,
    								nodeType: "ExpressionStatement",
    								src: "4117:67:2"
    							},
    							{
    								eventCall: {
    									"arguments": [
    										{
    											expression: {
    												id: 365,
    												name: "WorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 159,
    												src: "4303:14:2",
    												typeDescriptions: {
    													typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    													typeString: "type(enum Voting.WorkflowStatus)"
    												}
    											},
    											id: 366,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											lValueRequested: false,
    											memberLocation: "4318:17:2",
    											memberName: "RegisteringVoters",
    											nodeType: "MemberAccess",
    											referencedDeclaration: 153,
    											src: "4303:32:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										},
    										{
    											id: 367,
    											name: "currentWorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 195,
    											src: "4337:21:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										],
    										id: 364,
    										name: "WorkflowStatusChange",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 173,
    										src: "4282:20:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_event_nonpayable$_t_enum$_WorkflowStatus_$159_$_t_enum$_WorkflowStatus_$159_$returns$__$",
    											typeString: "function (enum Voting.WorkflowStatus,enum Voting.WorkflowStatus)"
    										}
    									},
    									id: 368,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "4282:77:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 369,
    								nodeType: "EmitStatement",
    								src: "4277:82:2"
    							}
    						]
    					},
    					documentation: {
    						id: 346,
    						nodeType: "StructuredDocumentation",
    						src: "3636:71:2",
    						text: "@notice Start proposal session\n @custom:accessibility Admin"
    					},
    					functionSelector: "e09b8c79",
    					id: 371,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 349,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 348,
    								name: "onlyOwner",
    								nameLocations: [
    									"3760:9:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 31,
    								src: "3760:9:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "3760:9:2"
    						}
    					],
    					name: "startProposalsRegistration",
    					nameLocation: "3722:26:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 347,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "3748:2:2"
    					},
    					returnParameters: {
    						id: 350,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "3770:0:2"
    					},
    					scope: 640,
    					src: "3713:654:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 396,
    						nodeType: "Block",
    						src: "4505:619:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 381,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 378,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "4622:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 379,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "4647:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 380,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "4662:28:2",
    												memberName: "ProposalsRegistrationStarted",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 154,
    												src: "4647:43:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "4622:68:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "43616e6e6f7420656e642070726f706f73616c7320726567697374726174696f6e20617420746869732074696d652e",
    											id: 382,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "4692:49:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5",
    												typeString: "literal_string \"Cannot end proposals registration at this time.\""
    											},
    											value: "Cannot end proposals registration at this time."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_a1908aef426ba6291ab0be2638b35a4604c6d357c20ce3df8e740d31ef492cb5",
    												typeString: "literal_string \"Cannot end proposals registration at this time.\""
    											}
    										],
    										id: 377,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "4614:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 383,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "4614:128:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 384,
    								nodeType: "ExpressionStatement",
    								src: "4614:128:2"
    							},
    							{
    								expression: {
    									id: 388,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										id: 385,
    										name: "currentWorkflowStatus",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 195,
    										src: "4865:21:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										expression: {
    											id: 386,
    											name: "WorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 159,
    											src: "4889:14:2",
    											typeDescriptions: {
    												typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    												typeString: "type(enum Voting.WorkflowStatus)"
    											}
    										},
    										id: 387,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										lValueRequested: false,
    										memberLocation: "4904:26:2",
    										memberName: "ProposalsRegistrationEnded",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 155,
    										src: "4889:41:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									src: "4865:65:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								id: 389,
    								nodeType: "ExpressionStatement",
    								src: "4865:65:2"
    							},
    							{
    								eventCall: {
    									"arguments": [
    										{
    											expression: {
    												id: 391,
    												name: "WorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 159,
    												src: "5049:14:2",
    												typeDescriptions: {
    													typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    													typeString: "type(enum Voting.WorkflowStatus)"
    												}
    											},
    											id: 392,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											lValueRequested: false,
    											memberLocation: "5064:28:2",
    											memberName: "ProposalsRegistrationStarted",
    											nodeType: "MemberAccess",
    											referencedDeclaration: 154,
    											src: "5049:43:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										},
    										{
    											id: 393,
    											name: "currentWorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 195,
    											src: "5094:21:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										],
    										id: 390,
    										name: "WorkflowStatusChange",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 173,
    										src: "5028:20:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_event_nonpayable$_t_enum$_WorkflowStatus_$159_$_t_enum$_WorkflowStatus_$159_$returns$__$",
    											typeString: "function (enum Voting.WorkflowStatus,enum Voting.WorkflowStatus)"
    										}
    									},
    									id: 394,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "5028:88:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 395,
    								nodeType: "EmitStatement",
    								src: "5023:93:2"
    							}
    						]
    					},
    					documentation: {
    						id: 372,
    						nodeType: "StructuredDocumentation",
    						src: "4375:69:2",
    						text: "@notice End proposal session\n @custom:accessibility Admin"
    					},
    					functionSelector: "6c297445",
    					id: 397,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 375,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 374,
    								name: "onlyOwner",
    								nameLocations: [
    									"4495:9:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 31,
    								src: "4495:9:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "4495:9:2"
    						}
    					],
    					name: "endProposalsRegistration",
    					nameLocation: "4459:24:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 373,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "4483:2:2"
    					},
    					returnParameters: {
    						id: 376,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "4505:0:2"
    					},
    					scope: 640,
    					src: "4450:674:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 422,
    						nodeType: "Block",
    						src: "5256:590:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 407,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 404,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "5374:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 405,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "5399:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 406,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "5414:26:2",
    												memberName: "ProposalsRegistrationEnded",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 155,
    												src: "5399:41:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "5374:66:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "43616e6e6f7420737461727420766f74696e672073657373696f6e20617420746869732074696d652e",
    											id: 408,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "5442:43:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0",
    												typeString: "literal_string \"Cannot start voting session at this time.\""
    											},
    											value: "Cannot start voting session at this time."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_480eb42997a4e557073735ef4a86f3b56cb6e4e12e6956f9b67c1178dd3fdaf0",
    												typeString: "literal_string \"Cannot start voting session at this time.\""
    											}
    										],
    										id: 403,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "5366:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 409,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "5366:120:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 410,
    								nodeType: "ExpressionStatement",
    								src: "5366:120:2"
    							},
    							{
    								expression: {
    									id: 414,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										id: 411,
    										name: "currentWorkflowStatus",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 195,
    										src: "5595:21:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										expression: {
    											id: 412,
    											name: "WorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 159,
    											src: "5619:14:2",
    											typeDescriptions: {
    												typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    												typeString: "type(enum Voting.WorkflowStatus)"
    											}
    										},
    										id: 413,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										lValueRequested: false,
    										memberLocation: "5634:20:2",
    										memberName: "VotingSessionStarted",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 156,
    										src: "5619:35:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									src: "5595:59:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								id: 415,
    								nodeType: "ExpressionStatement",
    								src: "5595:59:2"
    							},
    							{
    								eventCall: {
    									"arguments": [
    										{
    											expression: {
    												id: 417,
    												name: "WorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 159,
    												src: "5773:14:2",
    												typeDescriptions: {
    													typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    													typeString: "type(enum Voting.WorkflowStatus)"
    												}
    											},
    											id: 418,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											lValueRequested: false,
    											memberLocation: "5788:26:2",
    											memberName: "ProposalsRegistrationEnded",
    											nodeType: "MemberAccess",
    											referencedDeclaration: 155,
    											src: "5773:41:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										},
    										{
    											id: 419,
    											name: "currentWorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 195,
    											src: "5816:21:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										],
    										id: 416,
    										name: "WorkflowStatusChange",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 173,
    										src: "5752:20:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_event_nonpayable$_t_enum$_WorkflowStatus_$159_$_t_enum$_WorkflowStatus_$159_$returns$__$",
    											typeString: "function (enum Voting.WorkflowStatus,enum Voting.WorkflowStatus)"
    										}
    									},
    									id: 420,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "5752:86:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 421,
    								nodeType: "EmitStatement",
    								src: "5747:91:2"
    							}
    						]
    					},
    					documentation: {
    						id: 398,
    						nodeType: "StructuredDocumentation",
    						src: "5132:69:2",
    						text: "@notice Start voting session\n @custom:accessibility Admin"
    					},
    					functionSelector: "ee74c678",
    					id: 423,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 401,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 400,
    								name: "onlyOwner",
    								nameLocations: [
    									"5246:9:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 31,
    								src: "5246:9:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "5246:9:2"
    						}
    					],
    					name: "startVotingSession",
    					nameLocation: "5216:18:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 399,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "5234:2:2"
    					},
    					returnParameters: {
    						id: 402,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "5256:0:2"
    					},
    					scope: 640,
    					src: "5207:639:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 448,
    						nodeType: "Block",
    						src: "5974:563:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											id: 433,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												id: 430,
    												name: "currentWorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 195,
    												src: "6079:21:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "==",
    											rightExpression: {
    												expression: {
    													id: 431,
    													name: "WorkflowStatus",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 159,
    													src: "6104:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    														typeString: "type(enum Voting.WorkflowStatus)"
    													}
    												},
    												id: 432,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												lValueRequested: false,
    												memberLocation: "6119:20:2",
    												memberName: "VotingSessionStarted",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 156,
    												src: "6104:35:2",
    												typeDescriptions: {
    													typeIdentifier: "t_enum$_WorkflowStatus_$159",
    													typeString: "enum Voting.WorkflowStatus"
    												}
    											},
    											src: "6079:60:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "43616e6e6f7420656e6420766f74696e672073657373696f6e20617420746869732074696d652e",
    											id: 434,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "6141:41:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f",
    												typeString: "literal_string \"Cannot end voting session at this time.\""
    											},
    											value: "Cannot end voting session at this time."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_e261400a9f26a7a9c03704196e67d240f11b76b822d55fe42b593e0fd7c1f88f",
    												typeString: "literal_string \"Cannot end voting session at this time.\""
    											}
    										],
    										id: 429,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "6071:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 435,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "6071:112:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 436,
    								nodeType: "ExpressionStatement",
    								src: "6071:112:2"
    							},
    							{
    								expression: {
    									id: 440,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										id: 437,
    										name: "currentWorkflowStatus",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 195,
    										src: "6294:21:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										expression: {
    											id: 438,
    											name: "WorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 159,
    											src: "6318:14:2",
    											typeDescriptions: {
    												typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    												typeString: "type(enum Voting.WorkflowStatus)"
    											}
    										},
    										id: 439,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										lValueRequested: false,
    										memberLocation: "6333:18:2",
    										memberName: "VotingSessionEnded",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 157,
    										src: "6318:33:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									src: "6294:57:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								id: 441,
    								nodeType: "ExpressionStatement",
    								src: "6294:57:2"
    							},
    							{
    								eventCall: {
    									"arguments": [
    										{
    											expression: {
    												id: 443,
    												name: "WorkflowStatus",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 159,
    												src: "6470:14:2",
    												typeDescriptions: {
    													typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    													typeString: "type(enum Voting.WorkflowStatus)"
    												}
    											},
    											id: 444,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											lValueRequested: false,
    											memberLocation: "6485:20:2",
    											memberName: "VotingSessionStarted",
    											nodeType: "MemberAccess",
    											referencedDeclaration: 156,
    											src: "6470:35:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										},
    										{
    											id: 445,
    											name: "currentWorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 195,
    											src: "6507:21:2",
    											typeDescriptions: {
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											},
    											{
    												typeIdentifier: "t_enum$_WorkflowStatus_$159",
    												typeString: "enum Voting.WorkflowStatus"
    											}
    										],
    										id: 442,
    										name: "WorkflowStatusChange",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 173,
    										src: "6449:20:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_event_nonpayable$_t_enum$_WorkflowStatus_$159_$_t_enum$_WorkflowStatus_$159_$returns$__$",
    											typeString: "function (enum Voting.WorkflowStatus,enum Voting.WorkflowStatus)"
    										}
    									},
    									id: 446,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "6449:80:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 447,
    								nodeType: "EmitStatement",
    								src: "6444:85:2"
    							}
    						]
    					},
    					documentation: {
    						id: 424,
    						nodeType: "StructuredDocumentation",
    						src: "5854:67:2",
    						text: "@notice End voting session\n @custom:accessibility Admin"
    					},
    					functionSelector: "a7bfab16",
    					id: 449,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 427,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 426,
    								name: "onlyOwner",
    								nameLocations: [
    									"5964:9:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 31,
    								src: "5964:9:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "5964:9:2"
    						}
    					],
    					name: "endVotingSession",
    					nameLocation: "5936:16:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 425,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "5952:2:2"
    					},
    					returnParameters: {
    						id: 428,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "5974:0:2"
    					},
    					scope: 640,
    					src: "5927:610:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 522,
    						nodeType: "Block",
    						src: "6798:791:2",
    						statements: [
    							{
    								expression: {
    									"arguments": [
    										{
    											commonType: {
    												typeIdentifier: "t_bytes32",
    												typeString: "bytes32"
    											},
    											id: 469,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											leftExpression: {
    												"arguments": [
    													{
    														"arguments": [
    															{
    																id: 463,
    																name: "_description",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 452,
    																src: "6995:12:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_string_memory_ptr",
    																	typeString: "string memory"
    																}
    															}
    														],
    														expression: {
    															argumentTypes: [
    																{
    																	typeIdentifier: "t_string_memory_ptr",
    																	typeString: "string memory"
    																}
    															],
    															expression: {
    																id: 461,
    																name: "abi",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 4294967295,
    																src: "6978:3:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_magic_abi",
    																	typeString: "abi"
    																}
    															},
    															id: 462,
    															isConstant: false,
    															isLValue: false,
    															isPure: true,
    															lValueRequested: false,
    															memberLocation: "6982:12:2",
    															memberName: "encodePacked",
    															nodeType: "MemberAccess",
    															src: "6978:16:2",
    															typeDescriptions: {
    																typeIdentifier: "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
    																typeString: "function () pure returns (bytes memory)"
    															}
    														},
    														id: 464,
    														isConstant: false,
    														isLValue: false,
    														isPure: false,
    														kind: "functionCall",
    														lValueRequested: false,
    														nameLocations: [
    														],
    														names: [
    														],
    														nodeType: "FunctionCall",
    														src: "6978:30:2",
    														tryCall: false,
    														typeDescriptions: {
    															typeIdentifier: "t_bytes_memory_ptr",
    															typeString: "bytes memory"
    														}
    													}
    												],
    												expression: {
    													argumentTypes: [
    														{
    															typeIdentifier: "t_bytes_memory_ptr",
    															typeString: "bytes memory"
    														}
    													],
    													id: 460,
    													name: "keccak256",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 4294967288,
    													src: "6968:9:2",
    													typeDescriptions: {
    														typeIdentifier: "t_function_keccak256_pure$_t_bytes_memory_ptr_$returns$_t_bytes32_$",
    														typeString: "function (bytes memory) pure returns (bytes32)"
    													}
    												},
    												id: 465,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												kind: "functionCall",
    												lValueRequested: false,
    												nameLocations: [
    												],
    												names: [
    												],
    												nodeType: "FunctionCall",
    												src: "6968:41:2",
    												tryCall: false,
    												typeDescriptions: {
    													typeIdentifier: "t_bytes32",
    													typeString: "bytes32"
    												}
    											},
    											nodeType: "BinaryOperation",
    											operator: "!=",
    											rightExpression: {
    												"arguments": [
    													{
    														hexValue: "",
    														id: 467,
    														isConstant: false,
    														isLValue: false,
    														isPure: true,
    														kind: "string",
    														lValueRequested: false,
    														nodeType: "Literal",
    														src: "7023:2:2",
    														typeDescriptions: {
    															typeIdentifier: "t_stringliteral_c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    															typeString: "literal_string \"\""
    														},
    														value: ""
    													}
    												],
    												expression: {
    													argumentTypes: [
    														{
    															typeIdentifier: "t_stringliteral_c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    															typeString: "literal_string \"\""
    														}
    													],
    													id: 466,
    													name: "keccak256",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 4294967288,
    													src: "7013:9:2",
    													typeDescriptions: {
    														typeIdentifier: "t_function_keccak256_pure$_t_bytes_memory_ptr_$returns$_t_bytes32_$",
    														typeString: "function (bytes memory) pure returns (bytes32)"
    													}
    												},
    												id: 468,
    												isConstant: false,
    												isLValue: false,
    												isPure: true,
    												kind: "functionCall",
    												lValueRequested: false,
    												nameLocations: [
    												],
    												names: [
    												],
    												nodeType: "FunctionCall",
    												src: "7013:13:2",
    												tryCall: false,
    												typeDescriptions: {
    													typeIdentifier: "t_bytes32",
    													typeString: "bytes32"
    												}
    											},
    											src: "6968:58:2",
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "50726f706f73616c2063616e2774206265206e756c6c",
    											id: 470,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "7028:24:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5",
    												typeString: "literal_string \"Proposal can't be null\""
    											},
    											value: "Proposal can't be null"
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_867785ceda949247291637c1950de1a4330082e613ae3aa4548627303ca9bec5",
    												typeString: "literal_string \"Proposal can't be null\""
    											}
    										],
    										id: 459,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "6960:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 471,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "6960:93:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 472,
    								nodeType: "ExpressionStatement",
    								src: "6960:93:2"
    							},
    							{
    								body: {
    									id: 520,
    									nodeType: "Block",
    									src: "7108:474:2",
    									statements: [
    										{
    											expression: {
    												"arguments": [
    													{
    														commonType: {
    															typeIdentifier: "t_bytes32",
    															typeString: "bytes32"
    														},
    														id: 500,
    														isConstant: false,
    														isLValue: false,
    														isPure: false,
    														lValueRequested: false,
    														leftExpression: {
    															"arguments": [
    																{
    																	"arguments": [
    																		{
    																			expression: {
    																				baseExpression: {
    																					id: 488,
    																					name: "proposals",
    																					nodeType: "Identifier",
    																					overloadedDeclarations: [
    																					],
    																					referencedDeclaration: 192,
    																					src: "7158:9:2",
    																					typeDescriptions: {
    																						typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    																						typeString: "struct Voting.Proposal storage ref[] storage ref"
    																					}
    																				},
    																				id: 490,
    																				indexExpression: {
    																					id: 489,
    																					name: "i",
    																					nodeType: "Identifier",
    																					overloadedDeclarations: [
    																					],
    																					referencedDeclaration: 474,
    																					src: "7168:1:2",
    																					typeDescriptions: {
    																						typeIdentifier: "t_uint256",
    																						typeString: "uint256"
    																					}
    																				},
    																				isConstant: false,
    																				isLValue: true,
    																				isPure: false,
    																				lValueRequested: false,
    																				nodeType: "IndexAccess",
    																				src: "7158:12:2",
    																				typeDescriptions: {
    																					typeIdentifier: "t_struct$_Proposal_$152_storage",
    																					typeString: "struct Voting.Proposal storage ref"
    																				}
    																			},
    																			id: 491,
    																			isConstant: false,
    																			isLValue: true,
    																			isPure: false,
    																			lValueRequested: false,
    																			memberLocation: "7171:11:2",
    																			memberName: "description",
    																			nodeType: "MemberAccess",
    																			referencedDeclaration: 149,
    																			src: "7158:24:2",
    																			typeDescriptions: {
    																				typeIdentifier: "t_string_storage",
    																				typeString: "string storage ref"
    																			}
    																		}
    																	],
    																	expression: {
    																		argumentTypes: [
    																			{
    																				typeIdentifier: "t_string_storage",
    																				typeString: "string storage ref"
    																			}
    																		],
    																		expression: {
    																			id: 486,
    																			name: "abi",
    																			nodeType: "Identifier",
    																			overloadedDeclarations: [
    																			],
    																			referencedDeclaration: 4294967295,
    																			src: "7141:3:2",
    																			typeDescriptions: {
    																				typeIdentifier: "t_magic_abi",
    																				typeString: "abi"
    																			}
    																		},
    																		id: 487,
    																		isConstant: false,
    																		isLValue: false,
    																		isPure: true,
    																		lValueRequested: false,
    																		memberLocation: "7145:12:2",
    																		memberName: "encodePacked",
    																		nodeType: "MemberAccess",
    																		src: "7141:16:2",
    																		typeDescriptions: {
    																			typeIdentifier: "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
    																			typeString: "function () pure returns (bytes memory)"
    																		}
    																	},
    																	id: 492,
    																	isConstant: false,
    																	isLValue: false,
    																	isPure: false,
    																	kind: "functionCall",
    																	lValueRequested: false,
    																	nameLocations: [
    																	],
    																	names: [
    																	],
    																	nodeType: "FunctionCall",
    																	src: "7141:42:2",
    																	tryCall: false,
    																	typeDescriptions: {
    																		typeIdentifier: "t_bytes_memory_ptr",
    																		typeString: "bytes memory"
    																	}
    																}
    															],
    															expression: {
    																argumentTypes: [
    																	{
    																		typeIdentifier: "t_bytes_memory_ptr",
    																		typeString: "bytes memory"
    																	}
    																],
    																id: 485,
    																name: "keccak256",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 4294967288,
    																src: "7131:9:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_function_keccak256_pure$_t_bytes_memory_ptr_$returns$_t_bytes32_$",
    																	typeString: "function (bytes memory) pure returns (bytes32)"
    																}
    															},
    															id: 493,
    															isConstant: false,
    															isLValue: false,
    															isPure: false,
    															kind: "functionCall",
    															lValueRequested: false,
    															nameLocations: [
    															],
    															names: [
    															],
    															nodeType: "FunctionCall",
    															src: "7131:53:2",
    															tryCall: false,
    															typeDescriptions: {
    																typeIdentifier: "t_bytes32",
    																typeString: "bytes32"
    															}
    														},
    														nodeType: "BinaryOperation",
    														operator: "!=",
    														rightExpression: {
    															"arguments": [
    																{
    																	"arguments": [
    																		{
    																			id: 497,
    																			name: "_description",
    																			nodeType: "Identifier",
    																			overloadedDeclarations: [
    																			],
    																			referencedDeclaration: 452,
    																			src: "7215:12:2",
    																			typeDescriptions: {
    																				typeIdentifier: "t_string_memory_ptr",
    																				typeString: "string memory"
    																			}
    																		}
    																	],
    																	expression: {
    																		argumentTypes: [
    																			{
    																				typeIdentifier: "t_string_memory_ptr",
    																				typeString: "string memory"
    																			}
    																		],
    																		expression: {
    																			id: 495,
    																			name: "abi",
    																			nodeType: "Identifier",
    																			overloadedDeclarations: [
    																			],
    																			referencedDeclaration: 4294967295,
    																			src: "7198:3:2",
    																			typeDescriptions: {
    																				typeIdentifier: "t_magic_abi",
    																				typeString: "abi"
    																			}
    																		},
    																		id: 496,
    																		isConstant: false,
    																		isLValue: false,
    																		isPure: true,
    																		lValueRequested: false,
    																		memberLocation: "7202:12:2",
    																		memberName: "encodePacked",
    																		nodeType: "MemberAccess",
    																		src: "7198:16:2",
    																		typeDescriptions: {
    																			typeIdentifier: "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
    																			typeString: "function () pure returns (bytes memory)"
    																		}
    																	},
    																	id: 498,
    																	isConstant: false,
    																	isLValue: false,
    																	isPure: false,
    																	kind: "functionCall",
    																	lValueRequested: false,
    																	nameLocations: [
    																	],
    																	names: [
    																	],
    																	nodeType: "FunctionCall",
    																	src: "7198:30:2",
    																	tryCall: false,
    																	typeDescriptions: {
    																		typeIdentifier: "t_bytes_memory_ptr",
    																		typeString: "bytes memory"
    																	}
    																}
    															],
    															expression: {
    																argumentTypes: [
    																	{
    																		typeIdentifier: "t_bytes_memory_ptr",
    																		typeString: "bytes memory"
    																	}
    																],
    																id: 494,
    																name: "keccak256",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 4294967288,
    																src: "7188:9:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_function_keccak256_pure$_t_bytes_memory_ptr_$returns$_t_bytes32_$",
    																	typeString: "function (bytes memory) pure returns (bytes32)"
    																}
    															},
    															id: 499,
    															isConstant: false,
    															isLValue: false,
    															isPure: false,
    															kind: "functionCall",
    															lValueRequested: false,
    															nameLocations: [
    															],
    															names: [
    															],
    															nodeType: "FunctionCall",
    															src: "7188:41:2",
    															tryCall: false,
    															typeDescriptions: {
    																typeIdentifier: "t_bytes32",
    																typeString: "bytes32"
    															}
    														},
    														src: "7131:98:2",
    														typeDescriptions: {
    															typeIdentifier: "t_bool",
    															typeString: "bool"
    														}
    													},
    													{
    														hexValue: "50726f706f73616c20616c726561647920726567697374657265642e",
    														id: 501,
    														isConstant: false,
    														isLValue: false,
    														isPure: true,
    														kind: "string",
    														lValueRequested: false,
    														nodeType: "Literal",
    														src: "7231:30:2",
    														typeDescriptions: {
    															typeIdentifier: "t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b",
    															typeString: "literal_string \"Proposal already registered.\""
    														},
    														value: "Proposal already registered."
    													}
    												],
    												expression: {
    													argumentTypes: [
    														{
    															typeIdentifier: "t_bool",
    															typeString: "bool"
    														},
    														{
    															typeIdentifier: "t_stringliteral_3e63ed102bee92428d3e379759b54d6cbf605a94d7e0310c0c8a89ddd11f853b",
    															typeString: "literal_string \"Proposal already registered.\""
    														}
    													],
    													id: 484,
    													name: "require",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    														4294967278,
    														4294967278
    													],
    													referencedDeclaration: 4294967278,
    													src: "7123:7:2",
    													typeDescriptions: {
    														typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    														typeString: "function (bool,string memory) pure"
    													}
    												},
    												id: 502,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												kind: "functionCall",
    												lValueRequested: false,
    												nameLocations: [
    												],
    												names: [
    												],
    												nodeType: "FunctionCall",
    												src: "7123:139:2",
    												tryCall: false,
    												typeDescriptions: {
    													typeIdentifier: "t_tuple$__$",
    													typeString: "tuple()"
    												}
    											},
    											id: 503,
    											nodeType: "ExpressionStatement",
    											src: "7123:139:2"
    										},
    										{
    											expression: {
    												"arguments": [
    													{
    														"arguments": [
    															{
    																id: 508,
    																name: "_description",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 452,
    																src: "7333:12:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_string_memory_ptr",
    																	typeString: "string memory"
    																}
    															},
    															{
    																hexValue: "30",
    																id: 509,
    																isConstant: false,
    																isLValue: false,
    																isPure: true,
    																kind: "number",
    																lValueRequested: false,
    																nodeType: "Literal",
    																src: "7375:1:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_rational_0_by_1",
    																	typeString: "int_const 0"
    																},
    																value: "0"
    															}
    														],
    														expression: {
    															argumentTypes: [
    																{
    																	typeIdentifier: "t_string_memory_ptr",
    																	typeString: "string memory"
    																},
    																{
    																	typeIdentifier: "t_rational_0_by_1",
    																	typeString: "int_const 0"
    																}
    															],
    															id: 507,
    															name: "Proposal",
    															nodeType: "Identifier",
    															overloadedDeclarations: [
    															],
    															referencedDeclaration: 152,
    															src: "7292:8:2",
    															typeDescriptions: {
    																typeIdentifier: "t_type$_t_struct$_Proposal_$152_storage_ptr_$",
    																typeString: "type(struct Voting.Proposal storage pointer)"
    															}
    														},
    														id: 510,
    														isConstant: false,
    														isLValue: false,
    														isPure: false,
    														kind: "structConstructorCall",
    														lValueRequested: false,
    														nameLocations: [
    															"7320:11:2",
    															"7364:9:2"
    														],
    														names: [
    															"description",
    															"voteCount"
    														],
    														nodeType: "FunctionCall",
    														src: "7292:100:2",
    														tryCall: false,
    														typeDescriptions: {
    															typeIdentifier: "t_struct$_Proposal_$152_memory_ptr",
    															typeString: "struct Voting.Proposal memory"
    														}
    													}
    												],
    												expression: {
    													argumentTypes: [
    														{
    															typeIdentifier: "t_struct$_Proposal_$152_memory_ptr",
    															typeString: "struct Voting.Proposal memory"
    														}
    													],
    													expression: {
    														id: 504,
    														name: "proposals",
    														nodeType: "Identifier",
    														overloadedDeclarations: [
    														],
    														referencedDeclaration: 192,
    														src: "7277:9:2",
    														typeDescriptions: {
    															typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    															typeString: "struct Voting.Proposal storage ref[] storage ref"
    														}
    													},
    													id: 506,
    													isConstant: false,
    													isLValue: false,
    													isPure: false,
    													lValueRequested: false,
    													memberLocation: "7287:4:2",
    													memberName: "push",
    													nodeType: "MemberAccess",
    													src: "7277:14:2",
    													typeDescriptions: {
    														typeIdentifier: "t_function_arraypush_nonpayable$_t_array$_t_struct$_Proposal_$152_storage_$dyn_storage_ptr_$_t_struct$_Proposal_$152_storage_$returns$__$attached_to$_t_array$_t_struct$_Proposal_$152_storage_$dyn_storage_ptr_$",
    														typeString: "function (struct Voting.Proposal storage ref[] storage pointer,struct Voting.Proposal storage ref)"
    													}
    												},
    												id: 511,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												kind: "functionCall",
    												lValueRequested: false,
    												nameLocations: [
    												],
    												names: [
    												],
    												nodeType: "FunctionCall",
    												src: "7277:116:2",
    												tryCall: false,
    												typeDescriptions: {
    													typeIdentifier: "t_tuple$__$",
    													typeString: "tuple()"
    												}
    											},
    											id: 512,
    											nodeType: "ExpressionStatement",
    											src: "7277:116:2"
    										},
    										{
    											eventCall: {
    												"arguments": [
    													{
    														commonType: {
    															typeIdentifier: "t_uint256",
    															typeString: "uint256"
    														},
    														id: 517,
    														isConstant: false,
    														isLValue: false,
    														isPure: false,
    														lValueRequested: false,
    														leftExpression: {
    															expression: {
    																id: 514,
    																name: "proposals",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 192,
    																src: "7549:9:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    																	typeString: "struct Voting.Proposal storage ref[] storage ref"
    																}
    															},
    															id: 515,
    															isConstant: false,
    															isLValue: false,
    															isPure: false,
    															lValueRequested: false,
    															memberLocation: "7559:6:2",
    															memberName: "length",
    															nodeType: "MemberAccess",
    															src: "7549:16:2",
    															typeDescriptions: {
    																typeIdentifier: "t_uint256",
    																typeString: "uint256"
    															}
    														},
    														nodeType: "BinaryOperation",
    														operator: "-",
    														rightExpression: {
    															hexValue: "31",
    															id: 516,
    															isConstant: false,
    															isLValue: false,
    															isPure: true,
    															kind: "number",
    															lValueRequested: false,
    															nodeType: "Literal",
    															src: "7568:1:2",
    															typeDescriptions: {
    																typeIdentifier: "t_rational_1_by_1",
    																typeString: "int_const 1"
    															},
    															value: "1"
    														},
    														src: "7549:20:2",
    														typeDescriptions: {
    															typeIdentifier: "t_uint256",
    															typeString: "uint256"
    														}
    													}
    												],
    												expression: {
    													argumentTypes: [
    														{
    															typeIdentifier: "t_uint256",
    															typeString: "uint256"
    														}
    													],
    													id: 513,
    													name: "ProposalRegistered",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 177,
    													src: "7530:18:2",
    													typeDescriptions: {
    														typeIdentifier: "t_function_event_nonpayable$_t_uint256_$returns$__$",
    														typeString: "function (uint256)"
    													}
    												},
    												id: 518,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												kind: "functionCall",
    												lValueRequested: false,
    												nameLocations: [
    												],
    												names: [
    												],
    												nodeType: "FunctionCall",
    												src: "7530:40:2",
    												tryCall: false,
    												typeDescriptions: {
    													typeIdentifier: "t_tuple$__$",
    													typeString: "tuple()"
    												}
    											},
    											id: 519,
    											nodeType: "EmitStatement",
    											src: "7525:45:2"
    										}
    									]
    								},
    								condition: {
    									commonType: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									},
    									id: 480,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftExpression: {
    										id: 477,
    										name: "i",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 474,
    										src: "7081:1:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									nodeType: "BinaryOperation",
    									operator: "<",
    									rightExpression: {
    										expression: {
    											id: 478,
    											name: "proposals",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 192,
    											src: "7085:9:2",
    											typeDescriptions: {
    												typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    												typeString: "struct Voting.Proposal storage ref[] storage ref"
    											}
    										},
    										id: 479,
    										isConstant: false,
    										isLValue: false,
    										isPure: false,
    										lValueRequested: false,
    										memberLocation: "7095:6:2",
    										memberName: "length",
    										nodeType: "MemberAccess",
    										src: "7085:16:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									src: "7081:20:2",
    									typeDescriptions: {
    										typeIdentifier: "t_bool",
    										typeString: "bool"
    									}
    								},
    								id: 521,
    								initializationExpression: {
    									assignments: [
    										474
    									],
    									declarations: [
    										{
    											constant: false,
    											id: 474,
    											mutability: "mutable",
    											name: "i",
    											nameLocation: "7074:1:2",
    											nodeType: "VariableDeclaration",
    											scope: 521,
    											src: "7069:6:2",
    											stateVariable: false,
    											storageLocation: "default",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											},
    											typeName: {
    												id: 473,
    												name: "uint",
    												nodeType: "ElementaryTypeName",
    												src: "7069:4:2",
    												typeDescriptions: {
    													typeIdentifier: "t_uint256",
    													typeString: "uint256"
    												}
    											},
    											visibility: "internal"
    										}
    									],
    									id: 476,
    									initialValue: {
    										hexValue: "30",
    										id: 475,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										kind: "number",
    										lValueRequested: false,
    										nodeType: "Literal",
    										src: "7078:1:2",
    										typeDescriptions: {
    											typeIdentifier: "t_rational_0_by_1",
    											typeString: "int_const 0"
    										},
    										value: "0"
    									},
    									nodeType: "VariableDeclarationStatement",
    									src: "7069:10:2"
    								},
    								loopExpression: {
    									expression: {
    										id: 482,
    										isConstant: false,
    										isLValue: false,
    										isPure: false,
    										lValueRequested: false,
    										nodeType: "UnaryOperation",
    										operator: "++",
    										prefix: false,
    										src: "7103:3:2",
    										subExpression: {
    											id: 481,
    											name: "i",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 474,
    											src: "7103:1:2",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											}
    										},
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									id: 483,
    									nodeType: "ExpressionStatement",
    									src: "7103:3:2"
    								},
    								nodeType: "ForStatement",
    								src: "7064:518:2"
    							}
    						]
    					},
    					documentation: {
    						id: 450,
    						nodeType: "StructuredDocumentation",
    						src: "6545:141:2",
    						text: "@notice For users to register proposal\n @param _description : Description of their proposal\n @custom:accessibility Voters"
    					},
    					functionSelector: "2f95355b",
    					id: 523,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 455,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 454,
    								name: "onlyVoters",
    								nameLocations: [
    									"6755:10:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 208,
    								src: "6755:10:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "6755:10:2"
    						},
    						{
    							id: 457,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 456,
    								name: "onlyDuringProposalsRegistration",
    								nameLocations: [
    									"6766:31:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 244,
    								src: "6766:31:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "6766:31:2"
    						}
    					],
    					name: "registerProposal",
    					nameLocation: "6701:16:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 453,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 452,
    								mutability: "mutable",
    								name: "_description",
    								nameLocation: "6732:12:2",
    								nodeType: "VariableDeclaration",
    								scope: 523,
    								src: "6718:26:2",
    								stateVariable: false,
    								storageLocation: "memory",
    								typeDescriptions: {
    									typeIdentifier: "t_string_memory_ptr",
    									typeString: "string"
    								},
    								typeName: {
    									id: 451,
    									name: "string",
    									nodeType: "ElementaryTypeName",
    									src: "6718:6:2",
    									typeDescriptions: {
    										typeIdentifier: "t_string_storage_ptr",
    										typeString: "string"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "6717:28:2"
    					},
    					returnParameters: {
    						id: 458,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "6798:0:2"
    					},
    					scope: 640,
    					src: "6692:897:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 572,
    						nodeType: "Block",
    						src: "7791:675:2",
    						statements: [
    							{
    								assignments: [
    									535
    								],
    								declarations: [
    									{
    										constant: false,
    										id: 535,
    										mutability: "mutable",
    										name: "voter",
    										nameLocation: "7885:5:2",
    										nodeType: "VariableDeclaration",
    										scope: 572,
    										src: "7871:19:2",
    										stateVariable: false,
    										storageLocation: "storage",
    										typeDescriptions: {
    											typeIdentifier: "t_struct$_Voter_$147_storage_ptr",
    											typeString: "struct Voting.Voter"
    										},
    										typeName: {
    											id: 534,
    											nodeType: "UserDefinedTypeName",
    											pathNode: {
    												id: 533,
    												name: "Voter",
    												nameLocations: [
    													"7871:5:2"
    												],
    												nodeType: "IdentifierPath",
    												referencedDeclaration: 147,
    												src: "7871:5:2"
    											},
    											referencedDeclaration: 147,
    											src: "7871:5:2",
    											typeDescriptions: {
    												typeIdentifier: "t_struct$_Voter_$147_storage_ptr",
    												typeString: "struct Voting.Voter"
    											}
    										},
    										visibility: "internal"
    									}
    								],
    								id: 540,
    								initialValue: {
    									baseExpression: {
    										id: 536,
    										name: "voters",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 188,
    										src: "7893:6:2",
    										typeDescriptions: {
    											typeIdentifier: "t_mapping$_t_address_$_t_struct$_Voter_$147_storage_$",
    											typeString: "mapping(address => struct Voting.Voter storage ref)"
    										}
    									},
    									id: 539,
    									indexExpression: {
    										expression: {
    											id: 537,
    											name: "msg",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 4294967281,
    											src: "7900:3:2",
    											typeDescriptions: {
    												typeIdentifier: "t_magic_message",
    												typeString: "msg"
    											}
    										},
    										id: 538,
    										isConstant: false,
    										isLValue: false,
    										isPure: false,
    										lValueRequested: false,
    										memberLocation: "7904:6:2",
    										memberName: "sender",
    										nodeType: "MemberAccess",
    										src: "7900:10:2",
    										typeDescriptions: {
    											typeIdentifier: "t_address",
    											typeString: "address"
    										}
    									},
    									isConstant: false,
    									isLValue: true,
    									isPure: false,
    									lValueRequested: false,
    									nodeType: "IndexAccess",
    									src: "7893:18:2",
    									typeDescriptions: {
    										typeIdentifier: "t_struct$_Voter_$147_storage",
    										typeString: "struct Voting.Voter storage ref"
    									}
    								},
    								nodeType: "VariableDeclarationStatement",
    								src: "7871:40:2"
    							},
    							{
    								expression: {
    									"arguments": [
    										{
    											id: 544,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											nodeType: "UnaryOperation",
    											operator: "!",
    											prefix: true,
    											src: "7985:15:2",
    											subExpression: {
    												expression: {
    													id: 542,
    													name: "voter",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 535,
    													src: "7986:5:2",
    													typeDescriptions: {
    														typeIdentifier: "t_struct$_Voter_$147_storage_ptr",
    														typeString: "struct Voting.Voter storage pointer"
    													}
    												},
    												id: 543,
    												isConstant: false,
    												isLValue: true,
    												isPure: false,
    												lValueRequested: false,
    												memberLocation: "7992:8:2",
    												memberName: "hasVoted",
    												nodeType: "MemberAccess",
    												referencedDeclaration: 144,
    												src: "7986:14:2",
    												typeDescriptions: {
    													typeIdentifier: "t_bool",
    													typeString: "bool"
    												}
    											},
    											typeDescriptions: {
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											}
    										},
    										{
    											hexValue: "596f75206861766520616c726561647920766f7465642e",
    											id: 545,
    											isConstant: false,
    											isLValue: false,
    											isPure: true,
    											kind: "string",
    											lValueRequested: false,
    											nodeType: "Literal",
    											src: "8002:25:2",
    											typeDescriptions: {
    												typeIdentifier: "t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863",
    												typeString: "literal_string \"You have already voted.\""
    											},
    											value: "You have already voted."
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_bool",
    												typeString: "bool"
    											},
    											{
    												typeIdentifier: "t_stringliteral_1814df8007c14967d1dedfd016a222fa9f9d3d95d881e38c6e569314cca84863",
    												typeString: "literal_string \"You have already voted.\""
    											}
    										],
    										id: 541,
    										name: "require",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    											4294967278,
    											4294967278
    										],
    										referencedDeclaration: 4294967278,
    										src: "7977:7:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_require_pure$_t_bool_$_t_string_memory_ptr_$returns$__$",
    											typeString: "function (bool,string memory) pure"
    										}
    									},
    									id: 546,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "7977:51:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 547,
    								nodeType: "ExpressionStatement",
    								src: "7977:51:2"
    							},
    							{
    								expression: {
    									id: 552,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										expression: {
    											id: 548,
    											name: "voter",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 535,
    											src: "8116:5:2",
    											typeDescriptions: {
    												typeIdentifier: "t_struct$_Voter_$147_storage_ptr",
    												typeString: "struct Voting.Voter storage pointer"
    											}
    										},
    										id: 550,
    										isConstant: false,
    										isLValue: true,
    										isPure: false,
    										lValueRequested: true,
    										memberLocation: "8122:8:2",
    										memberName: "hasVoted",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 144,
    										src: "8116:14:2",
    										typeDescriptions: {
    											typeIdentifier: "t_bool",
    											typeString: "bool"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										hexValue: "74727565",
    										id: 551,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										kind: "bool",
    										lValueRequested: false,
    										nodeType: "Literal",
    										src: "8133:4:2",
    										typeDescriptions: {
    											typeIdentifier: "t_bool",
    											typeString: "bool"
    										},
    										value: "true"
    									},
    									src: "8116:21:2",
    									typeDescriptions: {
    										typeIdentifier: "t_bool",
    										typeString: "bool"
    									}
    								},
    								id: 553,
    								nodeType: "ExpressionStatement",
    								src: "8116:21:2"
    							},
    							{
    								expression: {
    									id: 558,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										expression: {
    											id: 554,
    											name: "voter",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 535,
    											src: "8148:5:2",
    											typeDescriptions: {
    												typeIdentifier: "t_struct$_Voter_$147_storage_ptr",
    												typeString: "struct Voting.Voter storage pointer"
    											}
    										},
    										id: 556,
    										isConstant: false,
    										isLValue: true,
    										isPure: false,
    										lValueRequested: true,
    										memberLocation: "8154:15:2",
    										memberName: "votedProposalId",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 146,
    										src: "8148:21:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										id: 557,
    										name: "_proposalId",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 526,
    										src: "8172:11:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									src: "8148:35:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								id: 559,
    								nodeType: "ExpressionStatement",
    								src: "8148:35:2"
    							},
    							{
    								expression: {
    									id: 564,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									nodeType: "UnaryOperation",
    									operator: "++",
    									prefix: false,
    									src: "8274:34:2",
    									subExpression: {
    										expression: {
    											baseExpression: {
    												id: 560,
    												name: "proposals",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 192,
    												src: "8274:9:2",
    												typeDescriptions: {
    													typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    													typeString: "struct Voting.Proposal storage ref[] storage ref"
    												}
    											},
    											id: 562,
    											indexExpression: {
    												id: 561,
    												name: "_proposalId",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 526,
    												src: "8284:11:2",
    												typeDescriptions: {
    													typeIdentifier: "t_uint256",
    													typeString: "uint256"
    												}
    											},
    											isConstant: false,
    											isLValue: true,
    											isPure: false,
    											lValueRequested: false,
    											nodeType: "IndexAccess",
    											src: "8274:22:2",
    											typeDescriptions: {
    												typeIdentifier: "t_struct$_Proposal_$152_storage",
    												typeString: "struct Voting.Proposal storage ref"
    											}
    										},
    										id: 563,
    										isConstant: false,
    										isLValue: true,
    										isPure: false,
    										lValueRequested: true,
    										memberLocation: "8297:9:2",
    										memberName: "voteCount",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 151,
    										src: "8274:32:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								id: 565,
    								nodeType: "ExpressionStatement",
    								src: "8274:34:2"
    							},
    							{
    								eventCall: {
    									"arguments": [
    										{
    											expression: {
    												id: 567,
    												name: "msg",
    												nodeType: "Identifier",
    												overloadedDeclarations: [
    												],
    												referencedDeclaration: 4294967281,
    												src: "8434:3:2",
    												typeDescriptions: {
    													typeIdentifier: "t_magic_message",
    													typeString: "msg"
    												}
    											},
    											id: 568,
    											isConstant: false,
    											isLValue: false,
    											isPure: false,
    											lValueRequested: false,
    											memberLocation: "8438:6:2",
    											memberName: "sender",
    											nodeType: "MemberAccess",
    											src: "8434:10:2",
    											typeDescriptions: {
    												typeIdentifier: "t_address",
    												typeString: "address"
    											}
    										},
    										{
    											id: 569,
    											name: "_proposalId",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 526,
    											src: "8446:11:2",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											}
    										}
    									],
    									expression: {
    										argumentTypes: [
    											{
    												typeIdentifier: "t_address",
    												typeString: "address"
    											},
    											{
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											}
    										],
    										id: 566,
    										name: "Voted",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 183,
    										src: "8428:5:2",
    										typeDescriptions: {
    											typeIdentifier: "t_function_event_nonpayable$_t_address_$_t_uint256_$returns$__$",
    											typeString: "function (address,uint256)"
    										}
    									},
    									id: 570,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									kind: "functionCall",
    									lValueRequested: false,
    									nameLocations: [
    									],
    									names: [
    									],
    									nodeType: "FunctionCall",
    									src: "8428:30:2",
    									tryCall: false,
    									typeDescriptions: {
    										typeIdentifier: "t_tuple$__$",
    										typeString: "tuple()"
    									}
    								},
    								id: 571,
    								nodeType: "EmitStatement",
    								src: "8423:35:2"
    							}
    						]
    					},
    					documentation: {
    						id: 524,
    						nodeType: "StructuredDocumentation",
    						src: "7597:112:2",
    						text: "@notice For users to vote\n @param _proposalId : Id of proposal\n @custom:accessibility Voters"
    					},
    					functionSelector: "0121b93f",
    					id: 573,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 529,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 528,
    								name: "onlyVoters",
    								nameLocations: [
    									"7756:10:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 208,
    								src: "7756:10:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "7756:10:2"
    						},
    						{
    							id: 531,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 530,
    								name: "onlyDuringVotingSession",
    								nameLocations: [
    									"7767:23:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 220,
    								src: "7767:23:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "7767:23:2"
    						}
    					],
    					name: "vote",
    					nameLocation: "7724:4:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 527,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 526,
    								mutability: "mutable",
    								name: "_proposalId",
    								nameLocation: "7734:11:2",
    								nodeType: "VariableDeclaration",
    								scope: 573,
    								src: "7729:16:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 525,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "7729:4:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "7728:18:2"
    					},
    					returnParameters: {
    						id: 532,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "7791:0:2"
    					},
    					scope: 640,
    					src: "7715:751:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 630,
    						nodeType: "Block",
    						src: "8637:877:2",
    						statements: [
    							{
    								assignments: [
    									582
    								],
    								declarations: [
    									{
    										constant: false,
    										id: 582,
    										mutability: "mutable",
    										name: "winningVoteCount",
    										nameLocation: "8763:16:2",
    										nodeType: "VariableDeclaration",
    										scope: 630,
    										src: "8758:21:2",
    										stateVariable: false,
    										storageLocation: "default",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										},
    										typeName: {
    											id: 581,
    											name: "uint",
    											nodeType: "ElementaryTypeName",
    											src: "8758:4:2",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											}
    										},
    										visibility: "internal"
    									}
    								],
    								id: 584,
    								initialValue: {
    									hexValue: "30",
    									id: 583,
    									isConstant: false,
    									isLValue: false,
    									isPure: true,
    									kind: "number",
    									lValueRequested: false,
    									nodeType: "Literal",
    									src: "8782:1:2",
    									typeDescriptions: {
    										typeIdentifier: "t_rational_0_by_1",
    										typeString: "int_const 0"
    									},
    									value: "0"
    								},
    								nodeType: "VariableDeclarationStatement",
    								src: "8758:25:2"
    							},
    							{
    								assignments: [
    									586
    								],
    								declarations: [
    									{
    										constant: false,
    										id: 586,
    										mutability: "mutable",
    										name: "winningProposalIndex",
    										nameLocation: "8799:20:2",
    										nodeType: "VariableDeclaration",
    										scope: 630,
    										src: "8794:25:2",
    										stateVariable: false,
    										storageLocation: "default",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										},
    										typeName: {
    											id: 585,
    											name: "uint",
    											nodeType: "ElementaryTypeName",
    											src: "8794:4:2",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											}
    										},
    										visibility: "internal"
    									}
    								],
    								id: 588,
    								initialValue: {
    									hexValue: "30",
    									id: 587,
    									isConstant: false,
    									isLValue: false,
    									isPure: true,
    									kind: "number",
    									lValueRequested: false,
    									nodeType: "Literal",
    									src: "8822:1:2",
    									typeDescriptions: {
    										typeIdentifier: "t_rational_0_by_1",
    										typeString: "int_const 0"
    									},
    									value: "0"
    								},
    								nodeType: "VariableDeclarationStatement",
    								src: "8794:29:2"
    							},
    							{
    								body: {
    									id: 619,
    									nodeType: "Block",
    									src: "8937:365:2",
    									statements: [
    										{
    											condition: {
    												commonType: {
    													typeIdentifier: "t_uint256",
    													typeString: "uint256"
    												},
    												id: 605,
    												isConstant: false,
    												isLValue: false,
    												isPure: false,
    												lValueRequested: false,
    												leftExpression: {
    													expression: {
    														baseExpression: {
    															id: 600,
    															name: "proposals",
    															nodeType: "Identifier",
    															overloadedDeclarations: [
    															],
    															referencedDeclaration: 192,
    															src: "9129:9:2",
    															typeDescriptions: {
    																typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    																typeString: "struct Voting.Proposal storage ref[] storage ref"
    															}
    														},
    														id: 602,
    														indexExpression: {
    															id: 601,
    															name: "i",
    															nodeType: "Identifier",
    															overloadedDeclarations: [
    															],
    															referencedDeclaration: 590,
    															src: "9139:1:2",
    															typeDescriptions: {
    																typeIdentifier: "t_uint256",
    																typeString: "uint256"
    															}
    														},
    														isConstant: false,
    														isLValue: true,
    														isPure: false,
    														lValueRequested: false,
    														nodeType: "IndexAccess",
    														src: "9129:12:2",
    														typeDescriptions: {
    															typeIdentifier: "t_struct$_Proposal_$152_storage",
    															typeString: "struct Voting.Proposal storage ref"
    														}
    													},
    													id: 603,
    													isConstant: false,
    													isLValue: true,
    													isPure: false,
    													lValueRequested: false,
    													memberLocation: "9142:9:2",
    													memberName: "voteCount",
    													nodeType: "MemberAccess",
    													referencedDeclaration: 151,
    													src: "9129:22:2",
    													typeDescriptions: {
    														typeIdentifier: "t_uint256",
    														typeString: "uint256"
    													}
    												},
    												nodeType: "BinaryOperation",
    												operator: ">",
    												rightExpression: {
    													id: 604,
    													name: "winningVoteCount",
    													nodeType: "Identifier",
    													overloadedDeclarations: [
    													],
    													referencedDeclaration: 582,
    													src: "9154:16:2",
    													typeDescriptions: {
    														typeIdentifier: "t_uint256",
    														typeString: "uint256"
    													}
    												},
    												src: "9129:41:2",
    												typeDescriptions: {
    													typeIdentifier: "t_bool",
    													typeString: "bool"
    												}
    											},
    											id: 618,
    											nodeType: "IfStatement",
    											src: "9125:166:2",
    											trueBody: {
    												id: 617,
    												nodeType: "Block",
    												src: "9172:119:2",
    												statements: [
    													{
    														expression: {
    															id: 611,
    															isConstant: false,
    															isLValue: false,
    															isPure: false,
    															lValueRequested: false,
    															leftHandSide: {
    																id: 606,
    																name: "winningVoteCount",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 582,
    																src: "9191:16:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_uint256",
    																	typeString: "uint256"
    																}
    															},
    															nodeType: "Assignment",
    															operator: "=",
    															rightHandSide: {
    																expression: {
    																	baseExpression: {
    																		id: 607,
    																		name: "proposals",
    																		nodeType: "Identifier",
    																		overloadedDeclarations: [
    																		],
    																		referencedDeclaration: 192,
    																		src: "9210:9:2",
    																		typeDescriptions: {
    																			typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    																			typeString: "struct Voting.Proposal storage ref[] storage ref"
    																		}
    																	},
    																	id: 609,
    																	indexExpression: {
    																		id: 608,
    																		name: "i",
    																		nodeType: "Identifier",
    																		overloadedDeclarations: [
    																		],
    																		referencedDeclaration: 590,
    																		src: "9220:1:2",
    																		typeDescriptions: {
    																			typeIdentifier: "t_uint256",
    																			typeString: "uint256"
    																		}
    																	},
    																	isConstant: false,
    																	isLValue: true,
    																	isPure: false,
    																	lValueRequested: false,
    																	nodeType: "IndexAccess",
    																	src: "9210:12:2",
    																	typeDescriptions: {
    																		typeIdentifier: "t_struct$_Proposal_$152_storage",
    																		typeString: "struct Voting.Proposal storage ref"
    																	}
    																},
    																id: 610,
    																isConstant: false,
    																isLValue: true,
    																isPure: false,
    																lValueRequested: false,
    																memberLocation: "9223:9:2",
    																memberName: "voteCount",
    																nodeType: "MemberAccess",
    																referencedDeclaration: 151,
    																src: "9210:22:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_uint256",
    																	typeString: "uint256"
    																}
    															},
    															src: "9191:41:2",
    															typeDescriptions: {
    																typeIdentifier: "t_uint256",
    																typeString: "uint256"
    															}
    														},
    														id: 612,
    														nodeType: "ExpressionStatement",
    														src: "9191:41:2"
    													},
    													{
    														expression: {
    															id: 615,
    															isConstant: false,
    															isLValue: false,
    															isPure: false,
    															lValueRequested: false,
    															leftHandSide: {
    																id: 613,
    																name: "winningProposalIndex",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 586,
    																src: "9251:20:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_uint256",
    																	typeString: "uint256"
    																}
    															},
    															nodeType: "Assignment",
    															operator: "=",
    															rightHandSide: {
    																id: 614,
    																name: "i",
    																nodeType: "Identifier",
    																overloadedDeclarations: [
    																],
    																referencedDeclaration: 590,
    																src: "9274:1:2",
    																typeDescriptions: {
    																	typeIdentifier: "t_uint256",
    																	typeString: "uint256"
    																}
    															},
    															src: "9251:24:2",
    															typeDescriptions: {
    																typeIdentifier: "t_uint256",
    																typeString: "uint256"
    															}
    														},
    														id: 616,
    														nodeType: "ExpressionStatement",
    														src: "9251:24:2"
    													}
    												]
    											}
    										}
    									]
    								},
    								condition: {
    									commonType: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									},
    									id: 596,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftExpression: {
    										id: 593,
    										name: "i",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 590,
    										src: "8910:1:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									nodeType: "BinaryOperation",
    									operator: "<",
    									rightExpression: {
    										expression: {
    											id: 594,
    											name: "proposals",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 192,
    											src: "8914:9:2",
    											typeDescriptions: {
    												typeIdentifier: "t_array$_t_struct$_Proposal_$152_storage_$dyn_storage",
    												typeString: "struct Voting.Proposal storage ref[] storage ref"
    											}
    										},
    										id: 595,
    										isConstant: false,
    										isLValue: false,
    										isPure: false,
    										lValueRequested: false,
    										memberLocation: "8924:6:2",
    										memberName: "length",
    										nodeType: "MemberAccess",
    										src: "8914:16:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									src: "8910:20:2",
    									typeDescriptions: {
    										typeIdentifier: "t_bool",
    										typeString: "bool"
    									}
    								},
    								id: 620,
    								initializationExpression: {
    									assignments: [
    										590
    									],
    									declarations: [
    										{
    											constant: false,
    											id: 590,
    											mutability: "mutable",
    											name: "i",
    											nameLocation: "8903:1:2",
    											nodeType: "VariableDeclaration",
    											scope: 620,
    											src: "8898:6:2",
    											stateVariable: false,
    											storageLocation: "default",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											},
    											typeName: {
    												id: 589,
    												name: "uint",
    												nodeType: "ElementaryTypeName",
    												src: "8898:4:2",
    												typeDescriptions: {
    													typeIdentifier: "t_uint256",
    													typeString: "uint256"
    												}
    											},
    											visibility: "internal"
    										}
    									],
    									id: 592,
    									initialValue: {
    										hexValue: "30",
    										id: 591,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										kind: "number",
    										lValueRequested: false,
    										nodeType: "Literal",
    										src: "8907:1:2",
    										typeDescriptions: {
    											typeIdentifier: "t_rational_0_by_1",
    											typeString: "int_const 0"
    										},
    										value: "0"
    									},
    									nodeType: "VariableDeclarationStatement",
    									src: "8898:10:2"
    								},
    								loopExpression: {
    									expression: {
    										id: 598,
    										isConstant: false,
    										isLValue: false,
    										isPure: false,
    										lValueRequested: false,
    										nodeType: "UnaryOperation",
    										operator: "++",
    										prefix: false,
    										src: "8932:3:2",
    										subExpression: {
    											id: 597,
    											name: "i",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 590,
    											src: "8932:1:2",
    											typeDescriptions: {
    												typeIdentifier: "t_uint256",
    												typeString: "uint256"
    											}
    										},
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									id: 599,
    									nodeType: "ExpressionStatement",
    									src: "8932:3:2"
    								},
    								nodeType: "ForStatement",
    								src: "8893:409:2"
    							},
    							{
    								expression: {
    									id: 623,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										id: 621,
    										name: "winningProposalId",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 161,
    										src: "9404:17:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										id: 622,
    										name: "winningProposalIndex",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 586,
    										src: "9424:20:2",
    										typeDescriptions: {
    											typeIdentifier: "t_uint256",
    											typeString: "uint256"
    										}
    									},
    									src: "9404:40:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								id: 624,
    								nodeType: "ExpressionStatement",
    								src: "9404:40:2"
    							},
    							{
    								expression: {
    									id: 628,
    									isConstant: false,
    									isLValue: false,
    									isPure: false,
    									lValueRequested: false,
    									leftHandSide: {
    										id: 625,
    										name: "currentWorkflowStatus",
    										nodeType: "Identifier",
    										overloadedDeclarations: [
    										],
    										referencedDeclaration: 195,
    										src: "9455:21:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									nodeType: "Assignment",
    									operator: "=",
    									rightHandSide: {
    										expression: {
    											id: 626,
    											name: "WorkflowStatus",
    											nodeType: "Identifier",
    											overloadedDeclarations: [
    											],
    											referencedDeclaration: 159,
    											src: "9479:14:2",
    											typeDescriptions: {
    												typeIdentifier: "t_type$_t_enum$_WorkflowStatus_$159_$",
    												typeString: "type(enum Voting.WorkflowStatus)"
    											}
    										},
    										id: 627,
    										isConstant: false,
    										isLValue: false,
    										isPure: true,
    										lValueRequested: false,
    										memberLocation: "9494:12:2",
    										memberName: "VotesTallied",
    										nodeType: "MemberAccess",
    										referencedDeclaration: 158,
    										src: "9479:27:2",
    										typeDescriptions: {
    											typeIdentifier: "t_enum$_WorkflowStatus_$159",
    											typeString: "enum Voting.WorkflowStatus"
    										}
    									},
    									src: "9455:51:2",
    									typeDescriptions: {
    										typeIdentifier: "t_enum$_WorkflowStatus_$159",
    										typeString: "enum Voting.WorkflowStatus"
    									}
    								},
    								id: 629,
    								nodeType: "ExpressionStatement",
    								src: "9455:51:2"
    							}
    						]
    					},
    					documentation: {
    						id: 574,
    						nodeType: "StructuredDocumentation",
    						src: "8474:88:2",
    						text: "@notice Tally votes after ending voting session\n @custom:accessibility Admin"
    					},
    					functionSelector: "378a2178",
    					id: 631,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    						{
    							id: 577,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 576,
    								name: "onlyOwner",
    								nameLocations: [
    									"8599:9:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 31,
    								src: "8599:9:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "8599:9:2"
    						},
    						{
    							id: 579,
    							kind: "modifierInvocation",
    							modifierName: {
    								id: 578,
    								name: "onlyAfterVotingSessionEnded",
    								nameLocations: [
    									"8609:27:2"
    								],
    								nodeType: "IdentifierPath",
    								referencedDeclaration: 232,
    								src: "8609:27:2"
    							},
    							nodeType: "ModifierInvocation",
    							src: "8609:27:2"
    						}
    					],
    					name: "tallyVotes",
    					nameLocation: "8577:10:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 575,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "8587:2:2"
    					},
    					returnParameters: {
    						id: 580,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "8637:0:2"
    					},
    					scope: 640,
    					src: "8568:946:2",
    					stateMutability: "nonpayable",
    					virtual: false,
    					visibility: "external"
    				},
    				{
    					body: {
    						id: 638,
    						nodeType: "Block",
    						src: "9567:27:2",
    						statements: [
    							{
    								expression: {
    									hexValue: "31",
    									id: 636,
    									isConstant: false,
    									isLValue: false,
    									isPure: true,
    									kind: "number",
    									lValueRequested: false,
    									nodeType: "Literal",
    									src: "9585:1:2",
    									typeDescriptions: {
    										typeIdentifier: "t_rational_1_by_1",
    										typeString: "int_const 1"
    									},
    									value: "1"
    								},
    								functionReturnParameters: 635,
    								id: 637,
    								nodeType: "Return",
    								src: "9578:8:2"
    							}
    						]
    					},
    					functionSelector: "f8a8fd6d",
    					id: 639,
    					implemented: true,
    					kind: "function",
    					modifiers: [
    					],
    					name: "test",
    					nameLocation: "9531:4:2",
    					nodeType: "FunctionDefinition",
    					parameters: {
    						id: 632,
    						nodeType: "ParameterList",
    						parameters: [
    						],
    						src: "9535:2:2"
    					},
    					returnParameters: {
    						id: 635,
    						nodeType: "ParameterList",
    						parameters: [
    							{
    								constant: false,
    								id: 634,
    								mutability: "mutable",
    								name: "",
    								nameLocation: "-1:-1:-1",
    								nodeType: "VariableDeclaration",
    								scope: 639,
    								src: "9561:4:2",
    								stateVariable: false,
    								storageLocation: "default",
    								typeDescriptions: {
    									typeIdentifier: "t_uint256",
    									typeString: "uint256"
    								},
    								typeName: {
    									id: 633,
    									name: "uint",
    									nodeType: "ElementaryTypeName",
    									src: "9561:4:2",
    									typeDescriptions: {
    										typeIdentifier: "t_uint256",
    										typeString: "uint256"
    									}
    								},
    								visibility: "internal"
    							}
    						],
    						src: "9560:6:2"
    					},
    					scope: 640,
    					src: "9522:72:2",
    					stateMutability: "pure",
    					virtual: false,
    					visibility: "external"
    				}
    			],
    			scope: 641,
    			src: "276:9323:2",
    			usedErrors: [
    			]
    		}
    	],
    	src: "37:9564:2"
    };
    var compiler = {
    	name: "solc",
    	version: "0.8.19+commit.7dd6d404.Emscripten.clang"
    };
    var networks = {
    	"5777": {
    		events: {
    			"0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0": {
    				anonymous: false,
    				inputs: [
    					{
    						indexed: true,
    						internalType: "address",
    						name: "previousOwner",
    						type: "address"
    					},
    					{
    						indexed: true,
    						internalType: "address",
    						name: "newOwner",
    						type: "address"
    					}
    				],
    				name: "OwnershipTransferred",
    				type: "event"
    			},
    			"0x92e393e9b54e2f801d3ea4beb0c5e71a21cc34a5d34b77d0fb8a3aa1650dc18f": {
    				anonymous: false,
    				inputs: [
    					{
    						indexed: false,
    						internalType: "uint256",
    						name: "proposalId",
    						type: "uint256"
    					}
    				],
    				name: "ProposalRegistered",
    				type: "event"
    			},
    			"0x4d99b957a2bc29a30ebd96a7be8e68fe50a3c701db28a91436490b7d53870ca4": {
    				anonymous: false,
    				inputs: [
    					{
    						indexed: false,
    						internalType: "address",
    						name: "voter",
    						type: "address"
    					},
    					{
    						indexed: false,
    						internalType: "uint256",
    						name: "proposalId",
    						type: "uint256"
    					}
    				],
    				name: "Voted",
    				type: "event"
    			},
    			"0xb6be2187d059cc2a55fe29e0e503b566e1e0f8c8780096e185429350acffd3dd": {
    				anonymous: false,
    				inputs: [
    					{
    						indexed: false,
    						internalType: "address",
    						name: "voterAddress",
    						type: "address"
    					}
    				],
    				name: "VoterRegistered",
    				type: "event"
    			},
    			"0x0a97a4ee45751e2abf3e4fc8946939630b11b371ea8ae39ccdc3056e98f5cc3f": {
    				anonymous: false,
    				inputs: [
    					{
    						indexed: false,
    						internalType: "enum Voting.WorkflowStatus",
    						name: "previousStatus",
    						type: "uint8"
    					},
    					{
    						indexed: false,
    						internalType: "enum Voting.WorkflowStatus",
    						name: "newStatus",
    						type: "uint8"
    					}
    				],
    				name: "WorkflowStatusChange",
    				type: "event"
    			}
    		},
    		links: {
    		},
    		address: "0x93e5c00Abe9972F97Cde8A67d011f7267De4b5a0",
    		transactionHash: "0xa92187a897c331e1637e81f9d3c29eaca221a747207d07f0f3b96e7d57471d9d"
    	}
    };
    var schemaVersion = "3.4.13";
    var updatedAt = "2023-05-09T21:22:33.641Z";
    var networkType = "ethereum";
    var devdoc = {
    	author: "Wsh on est vraiment 8 ? / Modified by Nathan",
    	kind: "dev",
    	methods: {
    		"endProposalsRegistration()": {
    			"custom:accessibility": "Admin"
    		},
    		"endVotingSession()": {
    			"custom:accessibility": "Admin"
    		},
    		"getProposalsLength()": {
    			"custom:accessibility": "External"
    		},
    		"owner()": {
    			details: "Returns the address of the current owner."
    		},
    		"registerProposal(string)": {
    			"custom:accessibility": "Voters",
    			params: {
    				_description: ": Description of their proposal"
    			}
    		},
    		"registerVoters(address[])": {
    			"custom:accessibility": "Admin",
    			params: {
    				_voters: ": Address of voters"
    			}
    		},
    		"renounceOwnership()": {
    			details: "Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner."
    		},
    		"startProposalsRegistration()": {
    			"custom:accessibility": "Admin"
    		},
    		"startVotingSession()": {
    			"custom:accessibility": "Admin"
    		},
    		"tallyVotes()": {
    			"custom:accessibility": "Admin"
    		},
    		"transferOwnership(address)": {
    			details: "Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner."
    		},
    		"vote(uint256)": {
    			"custom:accessibility": "Voters",
    			params: {
    				_proposalId: ": Id of proposal"
    			}
    		}
    	},
    	title: "A voting system",
    	version: 1
    };
    var userdoc = {
    	kind: "user",
    	methods: {
    		"endProposalsRegistration()": {
    			notice: "End proposal session"
    		},
    		"endVotingSession()": {
    			notice: "End voting session"
    		},
    		"getProposalsLength()": {
    			notice: "Get proposal array length to get array in front"
    		},
    		"registerProposal(string)": {
    			notice: "For users to register proposal"
    		},
    		"registerVoters(address[])": {
    			notice: "Register voters"
    		},
    		"startProposalsRegistration()": {
    			notice: "Start proposal session"
    		},
    		"startVotingSession()": {
    			notice: "Start voting session"
    		},
    		"tallyVotes()": {
    			notice: "Tally votes after ending voting session"
    		},
    		"vote(uint256)": {
    			notice: "For users to vote"
    		}
    	},
    	notice: "This system permit users to make proposals and vote them",
    	version: 1
    };
    var Voting = {
    	contractName: contractName,
    	abi: abi,
    	metadata: metadata,
    	bytecode: bytecode,
    	deployedBytecode: deployedBytecode,
    	immutableReferences: immutableReferences,
    	generatedSources: generatedSources,
    	deployedGeneratedSources: deployedGeneratedSources,
    	sourceMap: sourceMap,
    	deployedSourceMap: deployedSourceMap,
    	source: source,
    	sourcePath: sourcePath,
    	ast: ast,
    	compiler: compiler,
    	networks: networks,
    	schemaVersion: schemaVersion,
    	updatedAt: updatedAt,
    	networkType: networkType,
    	devdoc: devdoc,
    	userdoc: userdoc
    };

    const getWeb3 = () =>
        new Promise((resolve, reject) => {
            // Wait for loading completion to avoid race conditions with web3 injection timing.
            window.addEventListener("load", async () => {
                // Modern dapp browsers...
                if (window.ethereum) {
                    const web3 = new Web3__default["default"](window.ethereum);
                    try {
                        // Request account access if needed
                        await window.ethereum.enable();
                        // Accounts now exposed
                        resolve(web3);
                    } catch (error) {
                        reject(error);
                    }
                }
                // Legacy dapp browsers...
                else if (window.web3) {
                    // Use Mist/MetaMask's provider.
                    const web3 = window.web3;
                    console.log("Injected web3 detected.");
                    resolve(web3);
                }
                // Fallback to localhost; use dev console port by default...
                else {
                    const provider = new Web3__default["default"].providers.HttpProvider(
                        "http://127.0.0.1:7545"
                    );
                    const web3 = new Web3__default["default"](provider);
                    console.log("No web3 instance injected, using Local web3.");
                    resolve(web3);
                }
            });
        });

    /* src/components/admin/FinishVote.svelte generated by Svelte v3.59.1 */

    const file$1 = "src/components/admin/FinishVote.svelte";

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "End voting";
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file$1, 11, 8, 303);
    			attr_dev(div0, "class", "row justify-content-center");
    			add_location(div0, file$1, 10, 4, 254);
    			attr_dev(div1, "class", "container py-2");
    			add_location(div1, file$1, 9, 0, 221);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*endVoting*/ ctx[0], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FinishVote', slots, []);
    	let { contractvar } = $$props;
    	let { accountsvar } = $$props;

    	const endVoting = () => {
    		contractvar.methods.endVotingSession().send({ from: accountsvar[0] });
    	}; //console.log(contractvar)

    	$$self.$$.on_mount.push(function () {
    		if (contractvar === undefined && !('contractvar' in $$props || $$self.$$.bound[$$self.$$.props['contractvar']])) {
    			console.warn("<FinishVote> was created without expected prop 'contractvar'");
    		}

    		if (accountsvar === undefined && !('accountsvar' in $$props || $$self.$$.bound[$$self.$$.props['accountsvar']])) {
    			console.warn("<FinishVote> was created without expected prop 'accountsvar'");
    		}
    	});

    	const writable_props = ['contractvar', 'accountsvar'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FinishVote> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('contractvar' in $$props) $$invalidate(1, contractvar = $$props.contractvar);
    		if ('accountsvar' in $$props) $$invalidate(2, accountsvar = $$props.accountsvar);
    	};

    	$$self.$capture_state = () => ({ contractvar, accountsvar, endVoting });

    	$$self.$inject_state = $$props => {
    		if ('contractvar' in $$props) $$invalidate(1, contractvar = $$props.contractvar);
    		if ('accountsvar' in $$props) $$invalidate(2, accountsvar = $$props.accountsvar);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [endVoting, contractvar, accountsvar];
    }

    class FinishVote extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { contractvar: 1, accountsvar: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FinishVote",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get contractvar() {
    		throw new Error("<FinishVote>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set contractvar(value) {
    		throw new Error("<FinishVote>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get accountsvar() {
    		throw new Error("<FinishVote>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set accountsvar(value) {
    		throw new Error("<FinishVote>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let div;
    	let t1;
    	let finishvote;
    	let current;

    	finishvote = new FinishVote({
    			props: {
    				contractvar: /*contractvar*/ ctx[1],
    				accountsvar: /*accountsvar*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Hello";
    			t1 = space();
    			create_component(finishvote.$$.fragment);
    			add_location(div, file, 76, 0, 2625);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(finishvote, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const finishvote_changes = {};
    			if (dirty & /*contractvar*/ 2) finishvote_changes.contractvar = /*contractvar*/ ctx[1];
    			if (dirty & /*accountsvar*/ 1) finishvote_changes.accountsvar = /*accountsvar*/ ctx[0];
    			finishvote.$set(finishvote_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(finishvote.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(finishvote.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			destroy_component(finishvote, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let web3var = null;
    	let accountsvar = null;
    	let contractvar = null;
    	let userAddressvar = null;
    	let isOwnervar = false;

    	onMount(async () => {
    		try {
    			// Get network provider and web3 instance.
    			const web3 = await getWeb3();

    			// Use web3 to get the user's accounts.
    			/* on récupère le tableau des comptes sur le metamask du user */
    			const accounts = await web3.eth.getAccounts();

    			// Get the contract instance.
    			const networkId = await web3.eth.net.getId();

    			const deployedNetwork = Voting.networks[networkId];
    			console.log("deployedNetwork", deployedNetwork);

    			/* Création de l'objet de contrat avec l'abi, le deployedNetwork et son address  */
    			const instance = new web3.eth.Contract(Voting.abi, deployedNetwork && deployedNetwork.address);

    			// Set web3, accounts, and contract to the state, and then proceed with an
    			// example of interacting with the contract's methods.
    			web3var = web3;

    			$$invalidate(0, accountsvar = accounts);
    			$$invalidate(1, contractvar = instance);
    			userAddressvar = accountsvar[0];

    			// Check if the user is the owner
    			const owner = await instance.methods.owner().call();

    			if (userAddressvar === owner) {
    				isOwnervar = true;
    			}
    		} catch(error) {
    			// Catch any errors for any of the above operations.
    			alert(`Failed to load web3, accounts, or contract. Check console for details.`);

    			console.error(error);
    		}
    	});

    	const startProposal = reactiveData => {
    		contractvar.methods.registerVoters(reactiveData).send({ from: accountsvar[0] });
    		contractvar.methods.startProposalsRegistration().send({ from: accountsvar[0] });
    	};

    	const endProposal = () => {
    		contractvar.methods.endProposalsRegistration().send({ from: accountsvar[0] });
    	};

    	const makeProposal = value => {
    		contractvar.methods.registerProposal(value).send({ from: accountsvar[0] });
    	};

    	const startVote = () => {
    		contractvar.methods.startVotingSession().send({ from: accountsvar[0] });
    	};

    	const tallyVote = () => {
    		contractvar.methods.tallyVotes().send({ from: accountsvar[0] });
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Voting,
    		onMount,
    		getWeb3,
    		FinishVote,
    		web3var,
    		accountsvar,
    		contractvar,
    		userAddressvar,
    		isOwnervar,
    		startProposal,
    		endProposal,
    		makeProposal,
    		startVote,
    		tallyVote
    	});

    	$$self.$inject_state = $$props => {
    		if ('web3var' in $$props) web3var = $$props.web3var;
    		if ('accountsvar' in $$props) $$invalidate(0, accountsvar = $$props.accountsvar);
    		if ('contractvar' in $$props) $$invalidate(1, contractvar = $$props.contractvar);
    		if ('userAddressvar' in $$props) userAddressvar = $$props.userAddressvar;
    		if ('isOwnervar' in $$props) isOwnervar = $$props.isOwnervar;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [accountsvar, contractvar];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})(Web3);
//# sourceMappingURL=bundle.js.map
