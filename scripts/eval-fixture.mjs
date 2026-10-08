import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { emptyState } from '../extension/model.mjs';
export const evaluationData = () => {
  const campaign={...emptyState().campaigns[0]};delete campaign.id;
  const rows=[
    ['compose','pending','comment','Cần AI cho bài tập lập trình','A'],
    ['compose','completed','comment','Cần tài nguyên học lập trình','A'],
    ['analyze','pending','page','Nguồn nhà cung cấp B','B'],
    ['compose','cancelled','comment','Đã dừng yêu cầu','A'],
    ['compose','pending','page','Giới thiệu tài nguyên AI','A'],
    ['compose','expired','comment','Yêu cầu hết hạn','A'],
    ['compose','completed','page','Thông tin gói B','B'],
    ['compose','completed','comment','Demo không có nhu cầu mua','B'],
    ['analyze','completed','page','Nguồn A','A'],
    ['compose','pending','comment','Cần công cụ dựng demo','B'],
    ['compose','pending','comment','So sánh công cụ','A'],
    ['compose','pending','page','Bài Page B','B'],
    ['compose','pending','comment','Cần công cụ học AI','A']
  ];
  return {tasks:rows.map(([kind,status,postKind,context,vendor],index)=>({id:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,key:`fixture:${index+1}`,kind,status,postKind,context,vendor,campaign:vendor==='A'?campaign:{...campaign,name:'Supplier B',link:'https://example.com/?ref=B&x=%2f',product:'Tài nguyên B'},link:vendor==='A'?campaign.link:'https://example.com/?ref=B&x=%2f',source:kind==='analyze'?context:'',createdAt:`2026-10-${String(index+1).padStart(2,'0')}T00:00:00Z`,expiresAt:status==='expired'?1:2524608000000,...(status==='completed'?{result:kind==='analyze'?{campaign:{...campaign,name:vendor==='A'?'AgentShop247':'Supplier B'}}:{relevant:index!==7,body:index===7?'':`Nội dung fixture ${index+1}`}}:{})}))};
};
if(process.argv.includes('--write')){const dir=resolve('.linkdesk-data/evaluation');await mkdir(dir,{recursive:true});await writeFile(join(dir,'tasks.json'),JSON.stringify(evaluationData(),null,2));process.stdout.write('Đã tạo dataset mô phỏng cố định tại .linkdesk-data/evaluation. Không dùng cho gửi Facebook.\n');}
