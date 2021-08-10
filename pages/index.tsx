import { Replicache } from "replicache";
import { useState, useEffect } from "react";
import { useSubscribe } from "replicache-react";
export default function Page() {
  let [rep, setRep] = useState<Replicache>();
  useEffect(() => {
    if (rep) return;
    let replicache = new Replicache({
      wasmModule: "/wasm/replicache.dev.wasm",
      name: "test-db",
      useMemstore: true,
      puller: async (_req) => {
        return {
          httpRequestInfo: { httpStatusCode: 200, errorMessage: "" },
          response: {
            cookie: {},
            lastMutationID: 0,
            patch: [
              { op: "clear" } as const,
              ...Array.from(Array(50).keys()).flatMap((n) => {
                return [
                  { op: "put", key: "itemInList-" + n, value: n },
                  {
                    op: "put",
                    key: "position-" + n,
                    value: 50 - n,
                  },
                  {
                    op: "put",
                    key: "content-" + n,
                    value: "content-" + n,
                  },
                ] as const;
              }),
            ],
          },
        };
      },
    });
    setRep(replicache);
  }, []);

  if (!rep) return <div> loading </div>;
  return <List rep={rep} />;
}

const List = (props: { rep: Replicache }) => {
  let list = useSubscribe(
    props.rep,
    async (tx) => {
      let list = await tx.scan({ prefix: "itemInList-" }).toArray();
      return list as number[];
    },
    [],
    []
  );
  return <SortedList rep={props.rep} list={list} />;
};

const SortedList = (props: { rep: Replicache; list: number[] }) => {
  let listWithPositions = useSubscribe(
    props.rep,
    async (tx) => {
      return Promise.all(
        props.list.map(async (l) => {
          let position = await tx.get("position-" + l);
          return { item: l, position: position as number };
        })
      );
    },
    [],
    [props.list]
  );
  return (
    <ul>
      {listWithPositions
        .sort((a, b) => (a > b ? -1 : 1))
        .map((l) => (
          <Item rep={props.rep} key={l.item} item={l.item} />
        ))}
    </ul>
  );
};

const Item = (props: { rep: Replicache; item: number }) => {
  let content = useSubscribe(
    props.rep,
    (tx) => tx.get("content-" + props.item),
    undefined,
    [props.item]
  );
  if (!content) return <li>no content</li>;
  return <li>{content}</li>;
};
