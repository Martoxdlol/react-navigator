# React Navigator Web

Simple easy to use router for react.

Main features:

- Simple api
- Focus on nested routing
- Support for animating transitions
- Switch router (typical router, no transition and state is typically reset)
- Stack router (stack of routes, transitions supported and state is typically kept)
- Server side rendering supported

**Note**: the documentation is incomplete, the project isn't well tested and it's not ready for production.

## Install

```sh
npm install react-navigator-web

# Or

yarn add react-navigator-web

# Or

pnpm add react-navigator-web
```

## Usage

```jsx
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { ReactNavigator, useLocation, ReactNavigatorOptions, PageRoute, useRoute, useQueryState, useNavigator, useRenderProps } from 'react-navigator'
import { Link } from 'react-navigator/dist/components'

function AnyPage() {
    const { id } = useLocation().params

    return <Scaffold>id: {id as string}</Scaffold>
}


// All ways to use `Link` component are equivalent
function Home() {
    return <Scaffold>
        <AppBar />
        <main>
            <h1>Home</h1>
            <p>
                <navigator.Link href="/about">About</navigator.Link>
            </p>
            <p>
                <Link navigator={navigator} href="/dashboard/settings">Dashboard (settings)</Link>
            </p>
            <p>
                <Link href="/123">Post 123</Link>
            </p>
        </main>
        <Footer />
    </Scaffold>
}

function Dashboard() {
    const location = useLocation()

    const route = useRoute()

    const [num] = useState(() => Math.floor(Math.random() * 100))

    // const showAll = location.query.showAll === '1'

    const [something, setSomething] = useQueryState('something', {
        // 'push' -> clicking on back button will set the previous value
        // 'replace' -> clicking on back button will go back to the previous page
        mode: 'push', 
        parse: (value) => value === '1',
        stringify: (value) => value ? '1' : null,
    })

    function toggleShowAll() {
        setSomething(!something)
    }

    // Other hooks
    // useNavigator()
    // useLocation()
    // useRoute()
    // useQueryState()
    // useRenderProps()

    const [error, setError] = useState<Error | undefined>(undefined)

    if (error) {
        throw error
    }

    return <Scaffold>
        <AppBar />
        <div>
            <p>Dashboard. Sub path: {location.childPath}. Random: {num}</p>
            <button type='button' onClick={toggleShowAll}>Toggle something</button>
            <p>Something: {something ? 'yes' : 'no'}</p>
            <button onClick={() => setError(new Error('Demo error'))}>Throw error</button>
        </div>
        <Footer />
    </Scaffold>
}

const options: ReactNavigatorOptions = {
    // staticUrl: '/some/path', // only for server side rendering or using another history implementation (optional)
    defaultRouteBackground: '#f1f1f1', // default: darkMode ? '#121212' : 'white' (optional)
    defaultRouteTransitionDuration: 300, // default duration of routes animations/transitions (optional)
    darkMode: false, // will affect default background (optional) 
    defaultRouteAnimation: 'slide' // default animation of routes (optional)
}

// Animations: 'scale' | 'fade' | 'slide' | 'none' | 'delayed-exit' | 'default'
// default -> scale
// delayed-exit: shows instantly but it have a delay for exit animation (for animated modals)
// none: no animation at all 

// using `/` at start or end of path is optional and will not have any effect (example: '/home/' equivalent to 'home')
const navigator = new ReactNavigator({
    '/': () => <Home />,
    '/:id': () => <AnyPage />,
    '/about': () => <Scaffold><AppBar />About page<Footer /></Scaffold>,
    'help': () => <Scaffold>Help page</Scaffold>,
    'help/:topic': () => <Scaffold>About page</Scaffold>,
    'dashboard/*': () => <Dashboard />,
}, options);


// Example components


function AppBar() {
    return <header style={{ width: '100%', padding: '5px' }}>
        <div style={{ width: '100%', padding: '5px', backgroundColor: '#ccc', display: 'flex', justifyContent: 'space-between' }}>
            <div>
                <button onClick={() => navigator.back()}>Back</button>
                <button onClick={() => navigator.forward()}>Forward</button>
                <button onClick={() => navigator.pop({ skipRouteCheck: true })}>Close</button>
            </div>
            <button onClick={() => showMenu()}>Menu</button>
        </div>
    </header>
}

function showMenu() {
    navigator.push(new PageRoute({
        opaque: false,
        transitionDuration: 100,
        animation: 'fade',
        popOnBack: true,
        removeOnPush: true,
        builder(props) {
            // console.log(props.location)
            return <Menu />
        },
    }))
}

function Menu() {
    return <Center>
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', width: '100%', height: '100%' }} onClick={e => navigator.pop()}>
            <Center>
                <main style={{ maxWidth: '300px', padding: '20px', width: '100%' }}>
                    <ul style={{ display: 'block', padding: '20px', backgroundColor: '#F1F1F1', boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.2)', listStyle: 'none' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <li><Link href='/'>Home</Link></li>
                        <li><Link href='/about'>About</Link></li>
                        <li><Link href='/dashboard'>Dashboard</Link></li>
                        <li><Link href='/dashboard/settings'>Settings</Link></li>
                        <li><Link href='/123'>123</Link></li>
                        <li><Link href='/567'>567</Link></li>
                    </ul>
                </main>
            </Center>
        </div>
    </Center>
}

// Put the navigator in the react tree

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <div style={{ position: 'fixed', height: '100%', width: '100%' }}>
            <navigator.Stack />
        </div>
    </React.StrictMode>,
);

/// Neccessary for showing this example

function Scaffold(props: { children: React.ReactNode }) {
    return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', width: '100%', border: '2px dashed black' }}>
        {props.children}
    </div>
}

function Footer() {
    return <footer style={{ width: '100%', padding: '5px' }}>
        <div style={{ width: '100%', padding: '5px', backgroundColor: '#ccc', display: 'flex', justifyContent: 'left' }}>
            <a href="https://github.com/Martoxdlol/react-navigator">GitHub</a>
        </div>
    </footer>
}

function Center(props: { children: React.ReactNode }) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', }}>
        {props.children}
    </div>
}
```