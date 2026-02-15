
export function generateFakeScrollerContent(){
    const content = [];
    for(let i = 0; i < 100; i++){
        content.push(`Item ${i}`);
    }

    return content.join('\n');
}