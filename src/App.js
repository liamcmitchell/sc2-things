import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink,
  Redirect
} from "react-router-dom";
import UnitTree from "./UnitTree";
import UnitStatistics from "./UnitStatistics";

const routes = [
  {
    title: "Unit Tree",
    path: "/unit-tree",
    component: UnitTree
  },
  {
    title: "Unit Statistics",
    path: "/unit-statistics",
    component: UnitStatistics
  }
];

function App() {
  return (
    <Router>
      <div style={{ display: "flex" }}>
        <nav style={{ flexShrink: 0, padding: 16 }}>
          <ul style={{ padding: 0, marginTop: 8, listStyle: "none" }}>
            {routes.map(({ title, path }) => (
              <li key={path} style={{ marginBottom: 4 }}>
                <NavLink
                  to={path}
                  activeStyle={{
                    color: "black"
                  }}
                >
                  {title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main style={{ flexGrow: 1, padding: 16 }}>
          <Switch>
            {routes.map(({ title, path, component: Component }) => (
              <Route key={path} path={path}>
                <h1 style={{ marginTop: 0 }}>{title}</h1>
                <Component />
              </Route>
            ))}

            <Route path="/">
              <Redirect to={routes[0].path} />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
