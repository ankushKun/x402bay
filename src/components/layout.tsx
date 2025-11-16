import Menubar from "./menubar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <div className="p-6">
        <Menubar />
        <div>{children}</div>
    </div>
}