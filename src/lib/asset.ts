/** public/ 配下のファイルURL。GitHub Pages のようにサブパスへ配置しても解決できるよう BASE_URL を付ける。 */
export const asset = (name: string): string => import.meta.env.BASE_URL + 'assets/' + name;

export const DUCK_EXPLAINING = 'duck-guide-explaining.png';
export const DUCK_STRUGGLING = 'duck-guide-struggling.png';
