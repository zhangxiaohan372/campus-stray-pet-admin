export function debounce(fn:Function, delay = 300) { 
    let timer:any = null
    return function (this:any,...args:any[]) { 
        clearTimeout(timer)
        timer = setTimeout(() => {
            fn.apply(this, args)
         },delay)
    }
}

export function throttle(fn: Function, delay = 300) { 
    let lastTime = 0
    return function (this: any, ...args: any[]) { 
        const now = Date.now()
        if (now - lastTime >= delay) { 
            fn.apply(this, args)
            lastTime = now
         }
        }
    }