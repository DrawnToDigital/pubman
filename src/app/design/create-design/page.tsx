import CreateDesign from "@/src/app/components/design/design-form";

export default function Page() {
  return <div className="space-y-6 bg-white p-6 rounded-md shadow-md max-w-xl mx-auto">
    <h1 className="text-2xl font-bold mb-4">Create New Design</h1>
    <CreateDesign />
  </div>;
}