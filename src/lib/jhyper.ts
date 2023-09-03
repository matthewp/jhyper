
type ActionFn = (this: Action, ev: JQuery.Event, result: any) => any;

class Action {
    fn: ActionFn;
    h: Hyper;
    target: string | JQuery | null;
    into: Action['to'];
    from: Action['to'];
    and: Action['then'];
    constructor(h: Hyper, fn: ActionFn) {
      this.h = h;
      this.fn = fn;
      this.target = null;
      this.into = this.from = this.to;
      this.and = this.then;
    }
  
    getTarget(ev: JQuery.Event) {
      return this.target || (ev as any).target;
    }
  
    to(sel: string | JQuery) {
      this.target = sel;
      return this;
    }
  
    then() {
      return this.h;
    }
  
    on(sel: string) {
      return this.h.on(sel);
    }
  }
  
  const HALT = Symbol('halt');
  
  class Hyper {
    $: JQueryStatic;
    $$: JQuery;
    actions: Array<Action>;
    constructor($$: JQuery, $: JQueryStatic) {
      this.$$ = $$;
      this.$ = $;
      this.actions = [];
    }
  
    #ext(fn: ActionFn) {
      let action = new Action(this, fn);
      this.actions.push(action);
      return action;
    }
  
    #run = async (ev: JQuery.Event) => {
      let result: any = null;
      loop: for (const action of this.actions) {
        result = action.fn(ev, result);
        if (result === HALT) {
          break loop;
        } else if (result != null && typeof result.then === 'function') {
          result = await result;
        }
      }
    };
  
    on(evName) {
      this.$$.on(evName, this.#run);
      return this;
    }
  
    run(fn: ActionFn) {
      return this.#ext(fn);
    }
  
    empty(target: string | JQuery) {
      const $ = this.$;
      return this.#ext(function (ev) {
        return $(target || this.getTarget(ev)).empty();
      });
    }
  
    addClass(cn: string) {
      const $ = this.$;
      return this.#ext(function (ev) {
        return $(this.getTarget(ev)).addClass(cn);
      });
    }
  
    removeClass(cn: string) {
      return this.#ext(function (ev) {
        return $(this.getTarget(ev)).removeClass(cn);
      });
    }
  
    fetch(url: string, init?: any) {
      return this.#ext(async () => {
        const res = await fetch(url, init);
        return await res.text();
      });
    }
  
    put() {
      const $ = this.$;
      return this.#ext(function (ev, value) {
        $(this.getTarget(ev)).html(value + '');
      });
    }
  
    when(fn: () => boolean) {
      return this.#ext(() => fn() || HALT).then();
    }
  
    toggleAttr(attrName: string, fn: () => boolean) {
      return this.#ext(function (ev) {
        let $$ = $(this.getTarget(ev));
        if (fn()) {
          $$.attr(attrName, '');
        } else {
          $$.removeAttr(attrName);
        }
      });
    }
  }

  interface HyperPluginFunction {
    /**
     * Apply the example plugin to the elements selected in the jQuery result.
     *
     * @param options Options to use for this application of the example plugin.
     * @returns jQuery result.
     */
    (): Hyper;
  }

  interface JQuery {
    /**
     * Extension of the example plugin.
     */
    hyper: HyperPluginFunction;
  }
  
  $.fn.hyper = function () {
    return new Hyper(this, $);
  };
  