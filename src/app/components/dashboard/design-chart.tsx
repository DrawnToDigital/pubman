import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell
} from "@/src/app/components/ui/table";

async function wait(ms: number): Promise<number[]> {
    // return new Promise(resolve => setTimeout(resolve, ms));
    return [ms]
}

export default async function DesignsChart() {
    const designs = await wait(2000);
    if (!designs || designs.length === 0) {
        return <p className="mt-4 text-gray-400">No data available.</p>;
    }

    return (
        <Table className="relative content-center w-full">
            <TableHeader>
                <TableRow>
                    <TableHead>Design</TableHead>
                    <TableHead>Info</TableHead>
                    <TableHead>Goes</TableHead>
                    <TableHead>Here</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                <TableCell>INV001</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Credit Card</TableCell>
                <TableCell>$250.00</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}