/**
 * 获取一个页面所在的容器
 * 一般是主界面容器包裹一个包装div，包装div内就是页面内容
 * @param el 当前页面的 div
 */
export const getPageContainer = (
	el: HTMLElement | null,
): null | HTMLElement => {
	if (!el) return null;
	const parent = el.parentElement;
	if (!parent) return null;
	return parent.parentElement;
};

