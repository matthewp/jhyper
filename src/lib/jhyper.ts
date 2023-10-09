type ActionFn = (
  this: HyperAction,
  ev: JQuery.Event,
  result: any,
  ...args: any[]
) => any;

class HyperAction {
  fn: ActionFn;
  l: HyperListener;
  target: string | JQuery | null;
  into: HyperAction['to'];
  onto: HyperAction['to'];
  from: HyperAction['to'];
  and: HyperAction['then'];
  constructor(l: HyperListener, fn: ActionFn) {
    this.l = l;
    this.fn = fn;
    this.target = null;
    this.into = this.from = this.onto = this.to;
    this.and = this.then;
  }

  getTarget(ev: JQuery.Event) {
    return this.target || (ev as any).target;
  }

  closest(sel: string) {
    this.target = this.l.$$.closest(sel);
    return this;
  }

  to(sel: string | JQuery) {
    this.target = sel;
    return this;
  }

  /**
   * Chain another action onto this event.
   */
  then() {
    return this.l;
  }

  on(evName: string) {
    return this.l.on(evName);
  }
}

const HALT = Symbol('halt');

class HyperListener {
  h: Hyper;
  $: JQueryStatic;
  $$: JQuery;
  evName: string;
  actions: Array<HyperAction>;
  constructor(h: Hyper, evName: string) {
    this.h = h;
    this.$ = h.$;
    this.$$ = h.$$;
    this.evName = evName;
    this.actions = [];

    this.$$.on(evName, this.#run);
  }

  #ext(fn: ActionFn) {
    let action = new HyperAction(this, fn);
    this.actions.push(action);
    return action;
  }

  #run = async (ev: JQuery.Event, firstResult: any, ...args: any[]) => {
    let result: any = firstResult;
    loop: for (const action of this.actions) {
      result = action.fn(ev, result, ...args) ?? result;
      if (result === HALT) {
        break loop;
      } else if (result != null && typeof result.then === 'function') {
        result = await result;
      }
    }
  };

  /**
   * Listen to the specified event and chain together actions.
   */
  on(evName: string) {
    return this.h.on(evName);
  }

  off() {
    this.$$.off(this.evName, this.#run);
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

  prop(pn: string, value: any) {
    return this.#ext(function(ev) {
      return $(this.getTarget(ev)).prop(pn, value);
    });
  }

  fetch(param0: string | (() => string | URL), init?: any) {
    return this.#ext(async () => {
      const url = typeof param0 === 'function' ? param0() : param0;
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

  when(fn: () => boolean | number) {
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

  trigger(evName: string) {
    return this.#ext(function (ev, result) {
      let $$ = $(this.getTarget(ev));
      $$.trigger(evName, result);
    });
  }
}

class Hyper {
  $: JQueryStatic;
  $$: JQuery;
  listeners: Array<HyperListener>;
  constructor($$: JQuery, $: JQueryStatic) {
    this.$$ = $$;
    this.$ = $;
    this.listeners = [];
  }

  /**
   * Listen to the specified event and chain together actions.
   */
  on(evName: string) {
    let l = new HyperListener(this, evName);
    this.listeners.push(l);
    return l;
  }

  off() {
    this.listeners.forEach(l => l.off());
    this.listeners.length = 0;
    return this;
  }
}

interface HyperPluginFunction {
  /**
   * A hyperized jQuery element. Chain together events and responses to events
   * without callback functions or imperative code.
   *
   * @returns Hyper object.
   */
  (): Hyper;
}

interface JQuery {
  /**
   * Hyperize a jQuery element.
   */
  hyper: HyperPluginFunction;
}

$.fn.hyper = function (this: JQuery) {
  return new Hyper(this, $);
};
